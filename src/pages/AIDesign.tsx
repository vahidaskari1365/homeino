import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Wand2, Loader2, ArrowLeft, Sparkles, RefreshCw,
  ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers,
  CheckCircle2, Banknote, Info, Maximize2, Minimize2, Download, Share2,
  Sofa, Blinds, Grid3x3, Lamp, BedDouble, Flower2, Image as ImageIcon, TreePine, Gem,
  type LucideIcon,
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { runAIDesignPipeline } from "@/lib/aiPipeline";
import type { PipelineResult } from "@/lib/aiPipeline";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import ProductOverlay from "@/components/ProductOverlay";
import { useTokens } from "@/hooks/useTokens";
import { trackEvent, trackAIDesignResult } from "@/lib/tracking";
import AIEntryCards from "@/components/AIEntryCards";
import AIDesignProgress from "@/components/AIDesignProgress";
import type { ProgressStep } from "@/components/AIDesignProgress";
import SelectedProductsFloatingPanel from "@/components/SelectedProductsFloatingPanel";
import AISuggestionAssistant from "@/components/AISuggestionAssistant";
import InspirationFlow from "@/components/InspirationFlow";
import type { ProductMatch } from "@/hooks/useObjectSearch";

type DesignStage = "UPLOADING" | "ANALYZING_SPACE" | "SELECTING_PRODUCTS" | "LAYING_OUT" | "RENDERING";

const STAGE_CONFIG: Record<DesignStage, { label: string }> = {
  UPLOADING:         { label: "آپلود تصویر" },
  ANALYZING_SPACE:   { label: "تحلیل ابعاد، نور و سبک فضا" },
  SELECTING_PRODUCTS:{ label: "بررسی و انتخاب محصولات" },
  LAYING_OUT:        { label: "چیدمان هوشمند محصولات در فضا" },
  RENDERING:         { label: "رندرگیری نهایی و بهینه‌سازی" },
};

const STAGES: DesignStage[] = [
  "UPLOADING","ANALYZING_SPACE","SELECTING_PRODUCTS","LAYING_OUT","RENDERING",
];

const STYLES = [
  { id: "modern",       label: "مدرن"         },
  { id: "classic",      label: "کلاسیک"       },
  { id: "minimalist",   label: "مینیمال"      },
  { id: "industrial",   label: "صنعتی"        },
  { id: "scandinavian", label: "اسکاندیناوی"  },
  { id: "luxury",       label: "لوکس"         },
  { id: "bohemian",     label: "بوهمی"        },
  { id: "japanese",     label: "ژاپنی"        },
];

const CATEGORIES: { slug: string; label: string; Icon: LucideIcon }[] = [
  { slug: "furniture",   label: "مبلمان",     Icon: Sofa },
  { slug: "curtain",     label: "پرده",       Icon: Blinds },
  { slug: "carpet",      label: "فرش",        Icon: Grid3x3 },
  { slug: "lighting",    label: "لوستر",      Icon: Lamp },
  { slug: "bedding",     label: "تخت و خواب", Icon: BedDouble },
  { slug: "plants",      label: "گل و گیاه",  Icon: Flower2 },
  { slug: "art",         label: "تابلو",      Icon: ImageIcon },
  { slug: "wood-decor",  label: "دکور چوبی",  Icon: TreePine },
  { slug: "accessories", label: "اکسسوری",    Icon: Gem },
];

type Product = {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  category_id: string | null;
  profile_id?: string;
  stock?: number;
  is_featured?: boolean;
};

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

const AIDesign = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"home" | "design" | "suggest" | "inspiration">(
    searchParams.get("products") ? "design" : searchParams.get("mode") === "inspiration" ? "inspiration" : "home"
  );
  const [imageBase64, setImageBase64]     = useState<string | null>(null);
  const [style, setStyle]                 = useState("modern");
  const [prompt, setPrompt]               = useState("");
  const [budget, setBudget]               = useState("");
  const [loading, setLoading]             = useState(false);
  const [currentStage, setCurrentStage]   = useState<DesignStage>("UPLOADING");
  const [geminiResult, setGeminiResult]   = useState<PipelineResult<Product> | null>(null);
  const [aiError, setAiError]             = useState<string | null>(null);
  const [activeCat, setActiveCat]         = useState(CATEGORIES[0].slug);
  const [catMap, setCatMap]               = useState<Record<string, string>>({});
  const [products, setProducts]           = useState<Record<string, Product[]>>({});
  const [selected, setSelected]           = useState<Record<string, Product>>({});
  const [quantities, setQuantities]       = useState<Record<string, number>>({});
  const [analyticsTab, setAnalyticsTab]   = useState<"consultation" | "placements">("consultation");
  const [fullscreen, setFullscreen]       = useState(false);
  const [showBefore, setShowBefore]       = useState(false);

  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const resultRef     = useRef<HTMLDivElement>(null);
  const { addItem, setOpen: setOpenCart } = useCart();

  const { freeDesignsRemaining, tokenBalance, hasCredit, consumeDesignCredit } = useTokens();

  useEffect(() => {
    const productIds = searchParams.get("products");
    if (!productIds) return;
    const ids = productIds.split(",").filter(Boolean);
    if (ids.length === 0) return;
    (async () => {
      const { data: preloaded } = await supabase
        .from("products")
        .select("id, name, price, image_url, category_id, profile_id, stock, is_featured")
        .in("id", ids);
      if (preloaded && preloaded.length > 0) {
        const preSelected: Record<string, Product> = {};
        preloaded.forEach((p) => { preSelected[p.id] = p as Product; });
        setSelected(preSelected);
        const sessionId = searchParams.get("session");
        if (sessionId) {
          supabase.from("design_sessions").update({ status: "designing" }).eq("id", sessionId).then();
        }
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from("producer_categories").select("id, slug");
      const map: Record<string, string> = {};
      (cats || []).forEach((c) => { map[c.slug] = c.id; });
      setCatMap(map);
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price, image_url, category_id, profile_id, stock, is_featured")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .limit(500);
      const byCat: Record<string, Product[]> = {};
      (prods || []).forEach((p) => {
        const slug = Object.keys(map).find((s) => map[s] === p.category_id);
        if (!slug) return;
        (byCat[slug] = byCat[slug] || []).push(p as Product);
      });
      setProducts(byCat);
    })();
  }, []);

  useEffect(() => {
    return () => { if (stageTimerRef.current) clearInterval(stageTimerRef.current); };
  }, []);

  const startStageProgression = useCallback(() => {
    const stages: DesignStage[] = ["ANALYZING_SPACE","SELECTING_PRODUCTS","LAYING_OUT","RENDERING"];
    let idx = 0;
    setCurrentStage("ANALYZING_SPACE");
    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    stageTimerRef.current = setInterval(() => {
      idx = Math.min(idx + 1, stages.length - 1);
      setCurrentStage(stages[idx]);
      if (idx >= stages.length - 1 && stageTimerRef.current) {
        clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
    }, 6000);
  }, []);

  const stopStageProgression = useCallback(() => {
    if (stageTimerRef.current) { clearInterval(stageTimerRef.current); stageTimerRef.current = null; }
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("لطفاً یک تصویر انتخاب کنید");
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setGeminiResult(null);
    };
    reader.readAsDataURL(file);
  };

  const toggleProduct = (p: Product) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) {
        delete next[p.id];
        setQuantities((q) => { const q2 = { ...q }; delete q2[p.id]; return q2; });
      } else {
        next[p.id] = p;
        setQuantities((q) => ({ ...q, [p.id]: 1 }));
      }
      return next;
    });
  };

  const setQuantity = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, qty) }));
  };

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const total        = selectedList.reduce((s, p) => s + (Number(p.price) || 0) * (quantities[p.id] || 1), 0);

  const selectedMap = useMemo(
    () => selectedList.reduce<Record<string, Product>>((acc, p) => { acc[p.id] = p; return acc; }, {}),
    [selectedList]
  );

  const generate = async () => {
    if (!imageBase64)            return toast.error("ابتدا یک عکس از فضای خانه آپلود کنید");
    if (selectedList.length === 0) return toast.error("حداقل یک محصول از بازار انتخاب کنید");
    setLoading(true);
    setGeminiResult(null);
    setAiError(null);
    startStageProgression();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("برای استفاده از هوش مصنوعی ابتدا وارد حساب کاربری شوید"); return; }
      const allowed = await consumeDesignCredit();
      if (!allowed) return;
      trackEvent("ai_started", { metadata: { style, budget: budgetNum, product_count: selectedList.length } });
      const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const geminiProducts = selectedList.map((p) => {
        const slug = Object.keys(catMap).find((s) => catMap[s] === p.category_id);
        const cat  = CATEGORIES.find((c) => c.slug === slug);
        return {
          id: p.id, name: p.name, category: cat?.label || "عمومی", style,
          price: p.price || 0, image_url: p.image_url || undefined,
          tags: [] as string[], is_featured: p.is_featured || false,
        };
      });
      const budgetNum = budget ? parseInt(budget.replace(/\D/g, ""), 10) : undefined;
      const { data, error } = await supabase.functions.invoke("gemini-decorator", {
        body: { image_base64: base64, products: geminiProducts, budget: budgetNum, ...(prompt.trim() ? { room_id: undefined } : {}) },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw new Error(error.message || "خطا در اتصال به سرور");
      if (data?.error && !data?.fallback) throw new Error(data.error);
      const result = runAIDesignPipeline<Product>(data, selectedMap);
      setGeminiResult(result);
      setCurrentStage("RENDERING");
      await new Promise((r) => setTimeout(r, 400));
      if (result.status !== "ok") {
        toast.error("هوش مصنوعی نتوانست چیدمان دقیقی پیشنهاد دهد. لطفاً دوباره تلاش کنید یا محصولات دیگری انتخاب کنید.");
        trackAIDesignResult("failed", { errorMessage: result.status, style, budget: budgetNum });
        const sessionId = searchParams.get("session");
        if (sessionId) supabase.from("design_sessions").update({ status: "abandoned" }).eq("id", sessionId).then();
      } else {
        toast.success("چیدمان هوشمند آماده شد");
        trackAIDesignResult("finished", { placementsCount: result.placements.length, style, budget: budgetNum });
        const sessionId = searchParams.get("session");
        if (sessionId) supabase.from("design_sessions").update({ status: "completed" }).eq("id", sessionId).then();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "خطا در تولید طراحی";
      console.error(e);
      setAiError(message);
      toast.error(message);
      trackAIDesignResult("failed", { errorMessage: message, style, budget: budgetNum });
    } finally {
      setLoading(false);
      stopStageProgression();
    }
  };

  const addToCart = (p: Product) => {
    const res = addItem({
      product_id: p.id, profile_id: p.profile_id || "",
      name: p.name, price: p.price || 0, image_url: p.image_url, stock: p.stock || 10,
    });
    if (res.ok) toast.success("به سبد خرید اضافه شد");
  };

  const buyAllProducts = () => {
    if (selectedList.length === 0) return;
    let count = 0;
    for (const p of selectedList) {
      const res = addItem({
        product_id: p.id, profile_id: p.profile_id || "",
        name: p.name, price: p.price || 0, image_url: p.image_url, stock: p.stock || 10,
      });
      if (res.ok) count++;
    }
    if (count > 0) { toast.success(`${count} محصول به سبد خرید اضافه شد`); setOpenCart(true); }
  };

  const currentProducts = products[activeCat] || [];

  const progressSteps: ProgressStep[] = STAGES.map((s) => ({
    key: s,
    label: STAGE_CONFIG[s].label,
    done: STAGES.indexOf(s) < STAGES.indexOf(currentStage) || (s === currentStage && s === "RENDERING" && geminiResult?.status === "ok"),
    active: s === currentStage && !(s === "RENDERING" && geminiResult?.status === "ok"),
  }));

  // ── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">

        {/* Back link — only when not in home mode */}
        {mode !== "home" && (
          <button onClick={() => setMode("home")} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm bg-card border border-border px-3 py-1.5 rounded-xl">
            <ArrowLeft size={16} /> بازگشت
          </button>
        )}

        {/* ── HOME MODE: Three entry cards ──────────── */}
        {mode === "home" && !searchParams.get("products") && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
                style={{
                  background: "linear-gradient(180deg, hsl(var(--accent)/0.15), hsl(var(--accent)/0.05))",
                  border: "1px solid hsl(var(--accent)/0.3)",
                }}>
                <Sparkles size={14} className="text-accent" />
                <span className="text-accent text-xs font-semibold">طراح داخلی هوشمند هومینو</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight"
                style={{
                  backgroundImage: "linear-gradient(180deg, hsl(158 54% 22%) 0%, hsl(158 48% 34%) 55%, hsl(28 28% 14%) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}>
                اتاق خودت را با هوش مصنوعی طراحی کن
              </h1>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                یک عکس آپلود کن، محصولات دلخواه انتخاب کن — هوش مصنوعی چیدمان را با نور، سبک و ابعاد اتاق هماهنگ می‌کند
              </p>
            </div>

            <AIEntryCards
              onStartDesign={() => setMode("design")}
              onStartInspiration={() => setMode("inspiration")}
              onStartSuggest={() => setMode("suggest")}
            />
          </div>
        )}

        {/* ── SUGGEST MODE: AI Suggestion Assistant ── */}
        {mode === "suggest" && !searchParams.get("products") && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">پیشنهاد هوشمند هومینو</h2>
              <p className="text-sm text-muted-foreground">به سؤالات زیر پاسخ دهید تا بهترین محصولات را پیشنهاد کنیم</p>
            </div>
            <AISuggestionAssistant
              onBack={() => setMode("home")}
              onComplete={(params) => {
                setStyle(params.style);
                const budgetMap: Record<string, string> = {
                  low: "10000000", mid: "50000000", high: "100000000", premium: "500000000",
                };
                setBudget(budgetMap[params.budget] || "");
                trackEvent("ai_suggestion_requested", {
                  metadata: { room_type: params.roomType, style: params.style, budget: params.budget },
                });
                setMode("design");
                toast.success("بر اساس انتخاب شما، محصولات زیر پیشنهاد می‌شود");
              }}
            />
          </div>
        )}

        {/* ── INSPIRATION MODE: Object Detection ── */}
        {mode === "inspiration" && !searchParams.get("products") && (
          <InspirationFlow
            onProceedToDesign={(products: ProductMatch[], totalPrice: number) => {
              const sel: Record<string, Product> = {};
              products.forEach((p) => {
                sel[p.product_id] = {
                  id: p.product_id,
                  name: p.product_name,
                  price: p.price,
                  image_url: p.image_url,
                  category_id: p.category,
                  profile_id: p.store_id || undefined,
                };
              });
              setSelected(sel);
              setMode("design");
            }}
            onBack={() => setMode("home")}
          />
        )}

        {/* ── DESIGN MODE: Full design flow ────────── */}
        {(mode === "design" || searchParams.get("products") || imageBase64 || selectedList.length > 0) && (
          <>
            {/* ViewInMyRoom banner */}
            {selectedList.length > 0 && searchParams.get("products") && (
              <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex items-center gap-3 mb-6 max-w-2xl mx-auto">
                <Sofa size={20} className="text-accent shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-bold text-accent">{selectedList[0]?.name}</span>
                  <span className="text-muted-foreground"> پیش‌انتخاب شد. عکس اتاق را آپلود کن — جمینی جای آن را مشخص می‌کند.</span>
                </div>
                <button onClick={() => setSelected({})} className="text-xs text-muted-foreground hover:text-foreground shrink-0">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className={`grid gap-6 ${geminiResult?.status === "ok" ? "lg:grid-cols-[1fr_320px]" : "lg:grid-cols-1 xl:grid-cols-[1fr_380px]"}`}>

              {/* ── MAIN CONTENT ────────────────── */}
              <div className="space-y-5 min-w-0">

                {/* Upload — compact */}
                {!imageBase64 && !loading && (
                  <div className="max-w-[500px]">
                    <div
                      onClick={() => inputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                      className="relative cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-accent/50 bg-card transition-all p-8 text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                        <Upload size={20} className="text-accent" />
                      </div>
                      <p className="text-sm font-semibold mb-1">عکس فضای خانه را آپلود کنید</p>
                      <p className="text-[10px] text-muted-foreground">کلیک کنید یا بکشید · JPG / PNG · حداکثر ۱۰ مگابایت</p>
                      <input ref={inputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    </div>
                  </div>
                )}

                {/* Image preview — compact */}
                {imageBase64 && !loading && (
                  <div className="max-w-[500px]">
                    <div className="relative rounded-2xl overflow-hidden bg-card border border-border group">
                      <img src={imageBase64} alt="فضا" className="w-full aspect-video object-cover" />
                      <button onClick={() => { setImageBase64(null); setGeminiResult(null); }}
                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center border border-border hover:bg-background">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Style selector */}
                <div className="flex flex-wrap gap-1.5">
                  {STYLES.map((s) => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                        style === s.id ? "bg-accent/10 text-accent border-accent/30" : "bg-card text-muted-foreground border-border hover:border-accent/30"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Category + Product grid — scrollable */}
                {!loading && (
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {CATEGORIES.map((c) => {
                        const count = (products[c.slug] || []).length;
                        const sel = selectedList.filter((p) => p.category_id === catMap[c.slug]).length;
                        const isActive = activeCat === c.slug;
                        const Icon = c.Icon;
                        return (
                          <button key={c.slug} onClick={() => setActiveCat(c.slug)}
                            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                              isActive ? "bg-accent/10 text-accent border-accent/30" : "bg-muted/30 text-muted-foreground border-border hover:border-accent/30"
                            }`}>
                            <Icon size={13} />
                            {c.label}
                            {sel > 0 && <span className="bg-accent text-accent-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{sel}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {currentProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">هنوز محصولی در این دسته ثبت نشده.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[320px] overflow-y-auto">
                        {currentProducts.map((p) => {
                          const isSel = !!selected[p.id];
                          return (
                            <button key={p.id} onClick={() => toggleProduct(p)}
                              className={`relative text-right rounded-xl border overflow-hidden transition-all bg-card ${
                                isSel ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-accent/40"
                              }`}>
                              <div className="aspect-square bg-muted overflow-hidden">
                                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                              </div>
                              <div className="p-1.5">
                                <p className="text-[10px] font-medium line-clamp-1">{p.name}</p>
                                <p className="text-[10px] text-accent mt-0.5">{fmt(p.price)}</p>
                              </div>
                              {isSel && (
                                <div className="absolute top-1 left-1 flex items-center gap-0.5">
                                  <span className="w-4 h-4 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow">
                                    <CheckCircle2 size={10} />
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Budget + Prompt */}
                {!loading && (
                  <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">بودجه (اختیاری)</p>
                      <div className="relative">
                        <input type="text" inputMode="numeric" value={budget}
                          onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="مثلاً: ۵۰۰۰۰۰۰" dir="ltr"
                          className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent transition-colors" />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">تومان</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">توضیحات (اختیاری)</p>
                      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                        placeholder="مثلاً: مبل سمت پنجره..."
                        className="w-full bg-card border border-border rounded-xl p-2 text-sm h-[38px] outline-none focus:border-accent transition-colors resize-none" />
                    </div>
                  </div>
                )}

                {/* Generate button (not in loading) */}
                {!loading && !geminiResult && (
                  <button onClick={generate}
                    disabled={!imageBase64 || selectedList.length === 0}
                    className="btn-3d font-bold py-3 px-6 text-sm flex items-center justify-center gap-2 w-full max-w-md">
                    <Wand2 size={16} />
                    چیدمان هوشمند با جمینی
                  </button>
                )}

                {/* ── RESULT ──────────────────── */}
                {loading && (
                  <div className="max-w-md">
                    <AIDesignProgress steps={progressSteps} currentLabel={STAGE_CONFIG[currentStage]?.label} />
                  </div>
                )}

                {aiError && !loading && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm flex items-start gap-3 max-w-md">
                    <Info size={16} className="shrink-0 mt-0.5 text-destructive" />
                    <div className="flex-1 space-y-2">
                      <p className="text-destructive font-medium">خطا در تولید طراحی</p>
                      <p className="text-muted-foreground text-xs">{aiError}</p>
                      <button onClick={generate} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                        <RefreshCw size={12} /> تلاش دوباره
                      </button>
                    </div>
                  </div>
                )}

                {geminiResult && (
                  <div ref={resultRef} className={`space-y-4 transition-all ${fullscreen ? "fixed inset-4 z-50 bg-background overflow-y-auto p-6 rounded-2xl shadow-2xl border border-border" : ""}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">نتیجه چیدمان</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setFullscreen(!fullscreen)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                        <button onClick={() => {
                          const img = resultRef.current?.querySelector("img");
                          if (img) {
                            const link = document.createElement("a");
                            link.download = "homeino-design.png";
                            link.href = img.src;
                            link.click();
                            toast.success("تصویر ذخیره شد");
                          } else {
                            toast.error("تصویری برای ذخیره وجود ندارد");
                          }
                        }} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                          <Download size={14} />
                        </button>
                        <button onClick={async () => {
                          try {
                            await navigator.share({
                              title: "طراحی هوشمند هومینو",
                              text: "این طراحی رو با هوش مصنوعی هومینو انجام دادم",
                              url: window.location.href,
                            });
                          } catch {
                            navigator.clipboard?.writeText(window.location.href);
                            toast.success("لینک کپی شد");
                          }
                        }} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                          <Share2 size={14} />
                        </button>
                      </div>
                    </div>

                    {geminiResult.status !== "ok" && (
                      <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground flex items-start gap-2">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <span>{geminiResult.consultation || "طراحی معتبری تولید نشد"}</span>
                          <div><button onClick={generate} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"><RefreshCw size={12} /> تلاش دوباره</button></div>
                        </div>
                      </div>
                    )}

                    {geminiResult.status === "ok" && imageBase64 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowBefore(false)}
                            className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                              !showBefore ? "bg-accent/10 text-accent border-accent/30" : "bg-card text-muted-foreground border-border"
                            }`}
                          >
                            نتیجه AI
                          </button>
                          <button
                            onClick={() => setShowBefore(true)}
                            className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                              showBefore ? "bg-accent/10 text-accent border-accent/30" : "bg-card text-muted-foreground border-border"
                            }`}
                          >
                            تصویر اصلی
                          </button>
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-border shadow-lg bg-card">
                          {showBefore ? (
                            <img src={imageBase64} alt="فضای اصلی" className="w-full" />
                          ) : (
                            <ProductOverlay
                              roomImage={imageBase64}
                              placements={geminiResult.placements}
                              onProductClick={addToCart}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    <button onClick={generate} disabled={loading}
                      className="w-full bg-card border border-border hover:border-accent text-foreground py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
                      <RefreshCw size={15} /> چیدمان مجدد
                    </button>

                    {/* Detail tabs */}
                    <div className="space-y-3">
                      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
                        <button onClick={() => setAnalyticsTab("consultation")}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            analyticsTab === "consultation" ? "bg-accent/15 text-accent" : "text-muted-foreground"
                          }`}>
                          <Lightbulb size={13} /> مشاوره جمینی
                        </button>
                        <button onClick={() => setAnalyticsTab("placements")}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            analyticsTab === "placements" ? "bg-accent/15 text-accent" : "text-muted-foreground"
                          }`}>
                          <Layers size={13} /> جزئیات وسایل ({geminiResult.placements.length})
                        </button>
                      </div>

                      {analyticsTab === "consultation" && (
                        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Palette size={15} className="text-accent shrink-0" />
                            <span className="text-xs font-bold text-accent">سبک انتخابی شما:</span>
                            <Badge variant="secondary" className="text-xs">{STYLES.find((s) => s.id === style)?.label || style}</Badge>
                          </div>
                          <div className="flex gap-2 items-start">
                            <Lightbulb size={15} className="text-accent shrink-0 mt-0.5" />
                            <p className="text-sm leading-loose text-foreground">{geminiResult.consultation}</p>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-accent/20">
                            <Banknote size={14} className="text-accent shrink-0" />
                            <span className="text-xs text-muted-foreground">جمع قیمت (از دیتابیس):</span>
                            <span className="text-sm font-bold text-accent">{fmt(geminiResult.totalPrice)}</span>
                          </div>
                        </div>
                      )}

                      {analyticsTab === "placements" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                          {geminiResult.placements.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">هیچ وسیله‌ای جایگذاری نشد.</p>
                          ) : geminiResult.placements.map((pl) => {
                            const product = pl.product;
                            return (
                              <div key={pl.product_id} className="bg-card border border-border rounded-xl p-3 flex gap-3 items-center">
                                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                                  {product.image_url && <img src={product.image_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold line-clamp-1">{product.name}</p>
                                  <p className="text-xs text-accent font-bold mt-0.5">{fmt(product.price)}</p>
                                </div>
                                <button onClick={() => addToCart(product)}
                                  className="text-muted-foreground hover:text-accent transition-colors shrink-0" title="افزودن به سبد خرید">
                                  <ShoppingCart size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Buy the look */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <h3 className="font-bold flex items-center gap-2">
                        <ShoppingBag size={18} className="text-accent" /> خرید وسایل این طرح
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                        {selectedList.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 bg-card border border-border rounded-xl p-2">
                            <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0">
                              {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold line-clamp-1">{p.name}</p>
                              <p className="text-xs text-accent">{fmt(p.price)}</p>
                            </div>
                            <button onClick={() => addToCart(p)}
                              className="text-xs bg-accent/10 hover:bg-accent/20 text-accent px-2 py-1 rounded-lg transition-colors shrink-0">
                              <ShoppingCart size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={buyAllProducts}
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all">
                        <ShoppingBag size={16} /> خرید همه وسایل ({fmt(total)})
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SIDEBAR ───────────────────── */}
              {!geminiResult && (
                <div className="space-y-4">
                  {/* Selected products summary */}
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold flex items-center gap-2 text-sm">
                        <ShoppingCart size={16} /> انتخاب شده ({selectedList.length})
                      </h3>
                      {selectedList.length > 0 && (
                        <button onClick={() => setSelected({})} className="text-[10px] text-muted-foreground hover:text-foreground">پاک کردن</button>
                      )}
                    </div>
                    {selectedList.length === 0 ? (
                      <p className="text-xs text-muted-foreground">هنوز وسیله‌ای انتخاب نشده. از بخش محصولات انتخاب کن.</p>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {selectedList.map((p) => {
                          const qty = quantities[p.id] || 1;
                          return (
                            <div key={p.id} className="flex items-center gap-2 text-xs">
                              <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden shrink-0">
                                {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="line-clamp-1 font-medium text-[11px]">{p.name}</p>
                                <p className="text-accent text-[10px]">{fmt((p.price || 0) * qty)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setQuantity(p.id, qty + 1)} className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] hover:bg-accent/10">+</button>
                                <span className="text-[10px] font-bold w-4 text-center">{qty}</span>
                                <button onClick={() => qty > 1 ? setQuantity(p.id, qty - 1) : toggleProduct(p)} className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] hover:bg-accent/10">-</button>
                              </div>
                              <button onClick={() => toggleProduct(p)} className="text-muted-foreground hover:text-destructive shrink-0">
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedList.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border text-xs flex justify-between items-center">
                        <span className="text-muted-foreground">مجموع</span>
                        <span className="font-bold text-accent">{fmt(total)}</span>
                      </div>
                    )}
                  </div>

                  {/* Generate button in sidebar when ready */}
                  {imageBase64 && selectedList.length > 0 && !loading && (
                    <button onClick={generate} className="btn-3d w-full font-bold py-3 text-sm flex items-center justify-center gap-2">
                      <Wand2 size={16} /> چیدمان با جمینی
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Floating selected products panel */}
            {!loading && selectedList.length > 0 && (
              <SelectedProductsFloatingPanel
                products={selectedList}
                total={total}
                onRemove={(id) => toggleProduct(selectedList.find((p) => p.id === id)!)}
                onAddToCart={addToCart}
                onBuyAll={buyAllProducts}
                onClear={() => setSelected({})}
              />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AIDesign;
