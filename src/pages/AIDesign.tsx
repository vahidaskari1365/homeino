import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Wand2, Loader2, ArrowLeft, Sparkles, RefreshCw,
  ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers,
  CheckCircle2, Banknote, Info,
  Sofa, Blinds, Grid3x3, Lamp, BedDouble, Flower2, Image as ImageIcon, TreePine, Gem,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { runAIDesignPipeline } from "@/lib/aiPipeline";
import type { PipelineResult } from "@/lib/aiPipeline";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ProductOverlay from "@/components/ProductOverlay";
import { useTokens } from "@/hooks/useTokens";
import { trackEvent, trackAIDesignResult } from "@/lib/tracking";

// ─── Stage config ─────────────────────────────────────────────────────────────
type DesignStage = "UPLOADING" | "ANALYZING_SPACE" | "SELECTING_PRODUCTS" | "LAYING_OUT" | "RENDERING";

const STAGE_CONFIG: Record<DesignStage, { label: string; progress: number }> = {
  UPLOADING:         { label: "آپلود تصویر",                          progress: 0  },
  ANALYZING_SPACE:   { label: "تحلیل ابعاد، نور و سبک فضا...",        progress: 20 },
  SELECTING_PRODUCTS:{ label: "بررسی و انتخاب محصولات...",            progress: 40 },
  LAYING_OUT:        { label: "چیدمان هوشمند محصولات در فضا...",      progress: 65 },
  RENDERING:         { label: "رندرگیری نهایی و بهینه‌سازی...",        progress: 85 },
};

const STAGES: DesignStage[] = [
  "UPLOADING","ANALYZING_SPACE","SELECTING_PRODUCTS","LAYING_OUT","RENDERING",
];

// ─── Static data ──────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────
const AIDesign = () => {
  // ── state ──
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
  const [analyticsTab, setAnalyticsTab]   = useState<"consultation" | "placements">("consultation");

  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const { addItem, setOpen: setOpenCart } = useCart();

  // Token / free-quota billing gate (Customer Dashboard token system).
  // This sits strictly IN FRONT OF the Gemini pipeline — it only decides
  // whether the user is allowed to call gemini-decorator at all, and never
  // participates in AI validation/sanitization/rendering.
  const { freeDesignsRemaining, tokenBalance, hasCredit, consumeDesignCredit } = useTokens();

  // ── load products from Supabase ──
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

  // ── stage progression during loading ──
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

  // ── file handling ──
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("لطفاً یک تصویر انتخاب کنید");
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setGeminiResult(null);
    };
    reader.readAsDataURL(file);
  };

  // ── multi-select toggle — any number of products ──
  const toggleProduct = (p: Product) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = p;
      return next;
    });
  };

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const total        = selectedList.reduce((s, p) => s + (Number(p.price) || 0), 0);

  // ── selected map (id → product) for overlay ──
  const selectedMap = useMemo(
    () => selectedList.reduce<Record<string, Product>>((acc, p) => { acc[p.id] = p; return acc; }, {}),
    [selectedList]
  );

  // ── MAIN: call Gemini edge function ──
  const generate = async () => {
    if (!imageBase64)            return toast.error("ابتدا یک عکس از فضای خانه آپلود کنید");
    if (selectedList.length === 0) return toast.error("حداقل یک محصول از بازار انتخاب کنید");

    setLoading(true);
    setGeminiResult(null);
    setAiError(null);
    startStageProgression();

    try {
      // Auth check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("برای استفاده از هوش مصنوعی ابتدا وارد حساب کاربری شوید");
        return;
      }

      // Token / free-quota billing gate — first 3 AI designs are free, then
      // 1 token per design. Blocks BEFORE calling Gemini; never touches the
      // AI pipeline itself. Shows its own toast + returns early on failure.
      const allowed = await consumeDesignCredit();
      if (!allowed) return;

      trackEvent("ai_started", { metadata: { style, budget: budgetNum, product_count: selectedList.length } });

      // Strip data-URL prefix → raw base64
      const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

      // Build product list for Gemini — this IS the "provided product_id list";
      // the AI can never reference anything outside of it (enforced again,
      // independently, in the pipeline's SANITIZATION layer below).
      const geminiProducts = selectedList.map((p) => {
        const slug = Object.keys(catMap).find((s) => catMap[s] === p.category_id);
        const cat  = CATEGORIES.find((c) => c.slug === slug);
        return {
          id:          p.id,
          name:        p.name,
          category:    cat?.label || "عمومی",
          style,
          price:       p.price || 0,
          image_url:   p.image_url || undefined,
          tags:        [] as string[],
          is_featured: p.is_featured || false,
        };
      });

      const budgetNum = budget ? parseInt(budget.replace(/\D/g, ""), 10) : undefined;

      // Call the Supabase Edge Function (gemini-decorator). Reliability
      // (timeout + 2 retry attempts + fallback response) is enforced
      // server-side; a hard failure here (network/auth/rate-limit) is a
      // distinct condition from "AI returned no usable design" and is
      // surfaced as a dedicated, retryable error state below.
      const { data, error } = await supabase.functions.invoke("gemini-decorator", {
        body: {
          image_base64: base64,
          products:     geminiProducts,
          budget:       budgetNum,
          ...(prompt.trim() ? { room_id: undefined } : {}),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message || "خطا در اتصال به سرور");
      // A hard 429/error body (no fallback flag) is a real failure — surface it.
      if (data?.error && !data?.fallback) throw new Error(data.error);

      // ── AI OUTPUT → VALIDATION → SANITIZATION → NORMALIZATION → DATABASE ENRICHMENT ──
      // The single mandatory pipeline between the Edge Function response and
      // anything the UI Render Engine (<ProductOverlay>) is allowed to see.
      // `selectedMap` (Supabase-backed) is BOTH the whitelist of valid
      // product_ids AND the only source of product name/price/image — the AI
      // response can never contribute any of that data itself.
      const result = runAIDesignPipeline<Product>(data, selectedMap);

      setGeminiResult(result);
      setCurrentStage("RENDERING");
      await new Promise((r) => setTimeout(r, 400));

      if (result.status !== "ok") {
        toast.error("هوش مصنوعی نتوانست چیدمان دقیقی پیشنهاد دهد. لطفاً دوباره تلاش کنید یا محصولات دیگری انتخاب کنید.");
        trackAIDesignResult("failed", { errorMessage: result.status, style, budget: budgetNum });
      } else {
        toast.success("چیدمان هوشمند آماده شد ✨");
        trackAIDesignResult("finished", { placementsCount: result.placements.length, style, budget: budgetNum });
      }
    } catch (e) {
      // Hard failure (network / auth / rate-limit / unexpected exception).
      // Never let this crash the page — show a dedicated, retryable error
      // state instead (graceful degradation).
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


  // ── add a single product to cart ──
  const addToCart = (p: Product) => {
    const res = addItem({
      product_id: p.id,
      profile_id: p.profile_id || "",
      name:       p.name,
      price:      p.price || 0,
      image_url:  p.image_url,
      stock:      p.stock || 10,
    });
    if (res.ok) toast.success("به سبد خرید اضافه شد");
  };

  // ── buy all selected products ──
  const buyAllProducts = () => {
    if (selectedList.length === 0) return;
    let count = 0;
    for (const p of selectedList) {
      const res = addItem({
        product_id: p.id,
        profile_id: p.profile_id || "",
        name:       p.name,
        price:      p.price || 0,
        image_url:  p.image_url,
        stock:      p.stock || 10,
      });
      if (res.ok) count++;
    }
    if (count > 0) { toast.success(`${count} محصول به سبد خرید اضافه شد`); setOpenCart(true); }
  };

  const currentProducts = products[activeCat] || [];
  const stageConfig     = STAGE_CONFIG[currentStage];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> بازگشت به خانه
        </Link>

        {/* Header — cinematic 3D hero */}
        <div className="relative text-center mb-14 pt-6">
          <div className="ai-hero-orb w-[420px] h-[420px] left-1/2 -translate-x-1/2 -top-16 bg-accent/40" />
          <div className="ai-hero-orb w-[260px] h-[260px] right-8 top-4 bg-gold/40" style={{ animationDelay: "1.5s" }} />

          <div className="relative inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6"
            style={{
              background: "linear-gradient(180deg, hsl(var(--accent)/0.18), hsl(var(--accent)/0.06))",
              boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.6), 0 6px 18px -6px hsl(var(--accent)/0.35)",
              border: "1px solid hsl(var(--accent)/0.35)",
            }}>
            <Sparkles size={16} className="text-accent" />
            <span className="text-accent text-sm font-semibold">مشاور طراحی داخلی هوشمند هومینو</span>
          </div>

          <h1 className="relative text-4xl md:text-6xl font-bold mb-4 tracking-tight"
            style={{
              backgroundImage: "linear-gradient(180deg, hsl(158 54% 22%) 0%, hsl(158 48% 34%) 55%, hsl(28 28% 14%) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 1px 0 hsl(0 0% 100% / 0.4)",
              filter: "drop-shadow(0 12px 22px hsl(158 54% 15% / 0.22))",
            }}>
            اتاق‌ خودت را با هوش مصنوعی طراحی کن
          </h1>
          <p className="relative text-muted-foreground max-w-2xl mx-auto text-base md:text-lg leading-loose">
            یک عکس از فضا آپلود کن، محصولات دلخواه از بازار انتخاب کن — طراح هوشمند ما
            آن‌ها را با نور، سبک و ابعاد اتاق هماهنگ می‌کند.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Upload */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="step-medallion">۱</span>
                <h2 className="font-bold text-lg">عکس فضای خانه</h2>
              </div>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className="relative cursor-pointer tile-3d aspect-video flex items-center justify-center overflow-hidden"
                style={{
                  backgroundImage: imageBase64
                    ? undefined
                    : "repeating-linear-gradient(135deg, transparent 0 12px, hsl(var(--accent) / 0.04) 12px 24px)",
                }}
              >
                {imageBase64 ? (
                  <img src={imageBase64} alt="فضای آپلود شده" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-8">
                    <div className="icon-3d w-16 h-16 mx-auto mb-4">
                      <Upload size={26} strokeWidth={2} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">برای آپلود کلیک کنید یا عکس را اینجا بکشید</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">JPG / PNG · حداکثر ۱۰ مگابایت</p>
                  </div>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            </section>

            {/* Step 2: Style */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="step-medallion">۲</span>
                <h2 className="font-bold text-lg">سبک دکوراسیون</h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {STYLES.map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`tile-3d px-5 py-2.5 text-sm font-semibold ${
                      style === s.id ? "is-selected text-foreground" : "text-muted-foreground"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Multi-select products */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <span className="step-medallion">۳</span>
                <h2 className="font-bold text-lg">وسایل مورد نظر برای این فضا</h2>
              </div>
              <div className="flex items-center gap-2 mb-4 mr-12">
                <Info size={13} className="text-accent shrink-0" />
                <p className="text-xs text-muted-foreground">
                  از چند دسته همزمان انتخاب کن — مبل، لوستر، فرش و هر چیز دیگر. طراح ما همه را با هم چیدمان می‌کند.
                </p>
              </div>

              {/* Category tiles — 3D medallions */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-5">
                {CATEGORIES.map((c) => {
                  const count = (products[c.slug] || []).length;
                  const sel   = selectedList.filter((p) => p.category_id === catMap[c.slug]).length;
                  const isActive = activeCat === c.slug;
                  const Icon = c.Icon;
                  return (
                    <button key={c.slug} onClick={() => setActiveCat(c.slug)}
                      className={`tile-3d relative flex flex-col items-center gap-2 py-4 px-2 ${isActive ? "is-selected" : ""}`}>
                      <div className={`icon-3d w-12 h-12 ${isActive ? "is-active" : ""}`}>
                        <Icon size={22} strokeWidth={1.75} />
                      </div>
                      <span className={`text-xs font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{c.label}</span>
                      <span className="text-[10px] text-muted-foreground/70">({count})</span>
                      {sel > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center shadow-lg ring-2 ring-background">
                          {sel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>



              {/* Products grid */}
              {currentProducts.length === 0 ? (
                <div className="text-center py-10 bg-card border border-border rounded-2xl text-muted-foreground text-sm">
                  هنوز محصولی در این دسته ثبت نشده.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {currentProducts.map((p) => {
                    const isSel = !!selected[p.id];
                    return (
                      <button key={p.id} onClick={() => toggleProduct(p)}
                        className={`relative text-right rounded-xl border overflow-hidden transition-all bg-card ${
                          isSel
                            ? "border-accent ring-2 ring-accent/40"
                            : "border-border hover:border-accent/50"
                        }`}>
                        <div className="aspect-square bg-muted overflow-hidden">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-medium line-clamp-1">{p.name}</div>
                          <div className="text-xs text-accent mt-0.5">{fmt(p.price)}</div>
                        </div>
                        {isSel && (
                          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow">
                            <CheckCircle2 size={14} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 4: Budget + Description — synced to Gemini */}
            <section className="grid sm:grid-cols-2 gap-4">
              <div>
                <h2 className="font-bold mb-2 text-lg">۴. بودجه (اختیاری)</h2>
                <p className="text-xs text-muted-foreground mb-2">
                  جمینی فقط محصولاتی انتخاب می‌کند که در بودجه جا بشوند.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="مثلاً: ۵۰۰۰۰۰۰"
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    تومان
                  </span>
                </div>
              </div>
              <div>
                <h2 className="font-bold mb-2 text-lg">۵. توضیحات تکمیلی (اختیاری)</h2>
                <p className="text-xs text-muted-foreground mb-2">
                  جمینی این متن را در چیدمان در نظر می‌گیرد.
                </p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="مثلاً: مبل سمت پنجره، فرش روشن، لوستر طلایی..."
                  className="w-full bg-card border border-border rounded-xl p-3 text-sm h-[52px] outline-none focus:border-accent transition-colors resize-none"
                />
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN (sticky) ─────────────────────────────────────── */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">

            {/* Selected products summary */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <ShoppingCart size={18} /> انتخاب شده ({selectedList.length})
                </h3>
                {selectedList.length > 0 && (
                  <button onClick={() => setSelected({})} className="text-xs text-muted-foreground hover:text-foreground">
                    پاک کردن
                  </button>
                )}
              </div>

              {selectedList.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  هنوز وسیله‌ای انتخاب نشده. از بخش چپ هر تعداد محصول می‌توانی انتخاب کنی.
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {selectedList.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0">
                        {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="line-clamp-1 font-medium">{p.name}</div>
                        <div className="text-accent">{fmt(p.price)}</div>
                      </div>
                      <button onClick={() => toggleProduct(p)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedList.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border text-sm flex justify-between items-center">
                  <span className="text-muted-foreground">مجموع</span>
                  <span className="font-bold text-accent">{fmt(total)}</span>
                </div>
              )}
            </div>

            {/* Loading progress */}
            {loading && (
              <div className="bg-card border border-accent/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin text-accent" size={22} />
                  <div>
                    <p className="font-bold text-sm">{stageConfig.label}</p>
                    <p className="text-xs text-muted-foreground">لطفاً صبر کنید...</p>
                  </div>
                </div>
                <Progress value={stageConfig.progress} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {STAGES.filter((s) => s !== "UPLOADING").map((s) => {
                    const done = STAGES.indexOf(currentStage) >= STAGES.indexOf(s);
                    return (
                      <span key={s} className={`flex items-center gap-1 ${done ? "text-accent" : "opacity-40"}`}>
                        <span className={`w-2 h-2 rounded-full ${done ? "bg-accent" : "bg-muted-foreground"}`} />
                        {STAGE_CONFIG[s].label.split("...")[0]}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={loading || !imageBase64 || selectedList.length === 0}
              className="btn-3d w-full font-bold py-4 text-base flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="animate-spin" size={20} /> در حال چیدمان با جمینی...</>
                : <><Wand2 size={20} /> چیدمان هوشمند با جمینی</>
              }
            </button>

            {(!imageBase64 || selectedList.length === 0) && !loading && (
              <p className="text-xs text-muted-foreground text-center -mt-1">
                {!imageBase64 ? "⬆️ ابتدا یک عکس آپلود کنید" : "☝️ حداقل یک محصول انتخاب کنید"}
              </p>
            )}

            {/* ── RESULTS ────────────────────────────────────────────── */}

            {/* Dedicated ERROR state — hard failure (network/auth/rate-limit),
                distinct from "AI returned an empty design". Always retryable,
                never a silent failure or a crash. */}
            {aiError && !loading && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm flex items-start gap-3">
                <Info size={16} className="shrink-0 mt-0.5 text-destructive" />
                <div className="flex-1 space-y-2">
                  <p className="text-destructive font-medium">خطا در تولید طراحی</p>
                  <p className="text-muted-foreground text-xs">{aiError}</p>
                  <button
                    onClick={generate}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                  >
                    <RefreshCw size={12} /> تلاش دوباره
                  </button>
                </div>
              </div>
            )}

            {geminiResult && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">نتیجه چیدمان</h3>

                {/* Empty / invalid state — AI produced no valid, in-catalog placements,
                    or its response failed schema validation. The UI must never crash or
                    show a blank overlay silently; this makes the degraded state explicit
                    to the user ("No valid design generated"), with a one-click retry. */}
                {geminiResult.status !== "ok" && (
                  <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <span>
                        {geminiResult.consultation || "No valid design generated"}
                      </span>
                      <div>
                        <button
                          onClick={generate}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                        >
                          <RefreshCw size={12} /> تلاش دوباره
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlay Render Engine — receives ONLY fully validated, sanitized,
                    normalized, DB-enriched placements. It has zero knowledge of the AI
                    response shape and never performs its own product lookups. */}
                {geminiResult.status === "ok" && (
                  <ProductOverlay
                    roomImage={imageBase64!}
                    placements={geminiResult.placements}
                    onProductClick={addToCart}
                  />
                )}

                {/* Re-generate */}
                <button onClick={generate} disabled={loading}
                  className="w-full bg-card border border-border hover:border-accent text-foreground py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
                  <RefreshCw size={15} /> چیدمان مجدد
                </button>

                {/* Analytics tabs: Consultation | Placements */}
                <div className="space-y-3">
                  <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
                    <button
                      onClick={() => setAnalyticsTab("consultation")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        analyticsTab === "consultation" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Lightbulb size={13} /> مشاوره جمینی
                    </button>
                    <button
                      onClick={() => setAnalyticsTab("placements")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        analyticsTab === "placements" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers size={13} /> جزئیات وسایل ({geminiResult.placements.length})
                    </button>
                  </div>

                  {/* Consultation panel — Gemini's Persian design notes.
                      Style badge shows the USER-selected style (client state), never an
                      AI-invented value — the AI layer is not allowed to emit UI metadata. */}
                  {analyticsTab === "consultation" && (
                    <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Palette size={15} className="text-accent shrink-0" />
                        <span className="text-xs font-bold text-accent">سبک انتخابی شما:</span>
                        <Badge variant="secondary" className="text-xs">
                          {STYLES.find((s) => s.id === style)?.label || style}
                        </Badge>
                      </div>
                      <div className="flex gap-2 items-start">
                        <Lightbulb size={15} className="text-accent shrink-0 mt-0.5" />
                        <p className="text-sm leading-loose text-foreground">{geminiResult.consultation}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-accent/20">
                        <Banknote size={14} className="text-accent shrink-0" />
                        <span className="text-xs text-muted-foreground">جمع قیمت (از دیتابیس):</span>
                        {/* totalPrice is ALWAYS SUM(products.price) from Supabase, computed by
                            the pipeline's Database Enrichment layer — never an AI value. */}
                        <span className="text-sm font-bold text-accent">{fmt(geminiResult.totalPrice)}</span>
                      </div>
                    </div>
                  )}

                  {/* Placements panel — product identity/price/image come ONLY from the
                      DB-enriched placement objects (never from the AI); each placement's
                      `.product` field is the exact Supabase record. */}
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
                              <div className="text-xs font-bold line-clamp-1">{product.name}</div>
                              <div className="text-xs text-accent font-bold mt-0.5">{fmt(product.price)}</div>
                            </div>
                            <button
                              onClick={() => addToCart(product)}
                              className="text-muted-foreground hover:text-accent transition-colors shrink-0"
                              title="افزودن به سبد خرید"
                            >
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
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedList.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 bg-card border border-border rounded-xl p-2">
                        <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0">
                          {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold line-clamp-1">{p.name}</div>
                          <div className="text-xs text-accent">{fmt(p.price)}</div>
                        </div>
                        <button
                          onClick={() => addToCart(p)}
                          className="text-xs bg-accent/10 hover:bg-accent/20 text-accent px-2 py-1 rounded-lg transition-colors shrink-0"
                        >
                          <ShoppingCart size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={buyAllProducts}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all"
                  >
                    <ShoppingBag size={16} />
                    خرید همه وسایل ({fmt(total)})
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIDesign;
