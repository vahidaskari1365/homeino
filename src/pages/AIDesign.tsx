import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Wand2, Search, Sparkles, RefreshCw,
  ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers,
  CheckCircle2, Banknote, Info, Maximize2, Minimize2, Download, Share2,
  Sofa, Blinds, Grid3x3, Lamp, BedDouble, Flower2, Image as ImageIcon, TreePine, Gem,
  Compass, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
import AIDesignProgress from "@/components/AIDesignProgress";
import type { ProgressStep } from "@/components/AIDesignProgress";
import SelectedProductsFloatingPanel from "@/components/SelectedProductsFloatingPanel";
import AISuggestionAssistant from "@/components/AISuggestionAssistant";
import InspirationFlow from "@/components/InspirationFlow";
import type { ProductMatch } from "@/hooks/useObjectSearch";
import { formatPrice as fmt } from "@/lib/formatPrice";

type DesignStage = "UPLOADING" | "ANALYZING_SPACE" | "SELECTING_PRODUCTS" | "LAYING_OUT" | "RENDERING";

const STAGE_CONFIG: Record<DesignStage, { label: string }> = {
  UPLOADING:          { label: "آپلود تصویر" },
  ANALYZING_SPACE:    { label: "تحلیل ابعاد، نور و سبک فضا" },
  SELECTING_PRODUCTS: { label: "بررسی و انتخاب محصولات" },
  LAYING_OUT:         { label: "چیدمان هوشمند محصولات در فضا" },
  RENDERING:          { label: "رندرگیری نهایی و بهینه‌سازی" },
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

const AIDesign = () => {
  const [searchParams] = useSearchParams();

  // Tab mode: 3 core green-themed design modules
  const [activeTab, setActiveTab] = useState<"design" | "inspiration" | "suggest">(
    searchParams.get("mode") === "inspiration"
      ? "inspiration"
      : searchParams.get("mode") === "suggest"
      ? "suggest"
      : "design"
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

  const { consumeDesignCredit } = useTokens();

  // Handle pre-selected products from URL
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
        setActiveTab("design");
        const sessionId = searchParams.get("session");
        if (sessionId) {
          supabase.from("design_sessions").update({ status: "designing" }).eq("id", sessionId).then();
        }
      }
    })();
  }, [searchParams]);

  // Preload catalog categories & products
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
    if (!file.type.startsWith("image/")) return toast.error("لطفاً یک تصویر معتبر انتخاب کنید");
    if (file.size > 5 * 1024 * 1024) return toast.error("حجم عکس بیش از حد مجاز است (حداکثر ۵ مگابایت)");
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
    if (selectedList.length === 0) return toast.error("حداقل یک محصول از کاتالوگ انتخاب کنید");
    setLoading(true);
    setGeminiResult(null);
    setAiError(null);
    startStageProgression();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("برای استفاده از استودیو هومینو ابتدا وارد حساب کاربری شوید"); return; }
      const allowed = await consumeDesignCredit();
      if (!allowed) return;
      const budgetNum = budget ? parseInt(budget.replace(/\D/g, ""), 10) : undefined;
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
      const { data, error } = await supabase.functions.invoke("gemini-decorator", {
        body: { image_base64: base64, products: geminiProducts, budget: budgetNum, ...(prompt.trim() ? { prompt } : {}) },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw new Error(error.message || "خطا در اتصال به سرور");
      if (data?.error && !data?.fallback) throw new Error(data.error);
      const result = runAIDesignPipeline<Product>(data, selectedMap);
      setGeminiResult(result);
      setCurrentStage("RENDERING");
      await new Promise((r) => setTimeout(r, 400));
      if (result.status !== "ok") {
        toast.error("هومینو استودیو نتوانست چیدمان دقیقی پیشنهاد دهد. لطفاً دوباره تلاش کنید یا محصولات دیگری انتخاب کنید.");
        trackAIDesignResult("failed", { errorMessage: result.status, style, budget: budgetNum });
        const sessionId = searchParams.get("session");
        if (sessionId) supabase.from("design_sessions").update({ status: "abandoned" }).eq("id", sessionId).then();
      } else {
        toast.success("چیدمان هوشمند با موفقیت آماده شد");
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" dir="rtl">
      <Navbar />

      {/* Ambient Emerald Glow Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="ai-hero-orb w-96 h-96 bg-emerald-500/15 top-20 right-10 blur-3xl" />
        <div className="ai-hero-orb w-80 h-80 bg-emerald-600/10 bottom-20 left-10 blur-3xl" />
      </div>

      <main className="container mx-auto px-4 pt-28 pb-16 relative z-10 stage-3d-container">

        {/* ── HERO HEADER ────────────────────────────────────── */}
        <header className="text-center max-w-3xl mx-auto mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-xs font-black tracking-wide">هومینو استودیو — پلتفرم هوشمند طراحی و چیدمان دکوراسیون</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            خانه خودت را با <span className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">هومینو استودیو</span> طراحی کن
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            یک عکس آپلود کن، مدل‌های موردنظرت را از دیتابیس هوشمند انتخاب کن یا بگذار هومینو به صورت خودکار مبلمان، میز و لوستر را در تصویر خانه شما چیدمان کند.
          </p>
        </header>

        {/* ── GREEN GLOWING 3D NAVIGATION TABS (3 Core Modules) ───────────── */}
        <section className="max-w-4xl mx-auto mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2 rounded-2xl bg-card/90 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">

            {/* TAB 1: Smart Staging */}
            <button
              onClick={() => setActiveTab("design")}
              className={`text-right p-4 rounded-xl flex flex-col justify-between gap-3 transition-all duration-300 ${
                activeTab === "design"
                  ? "bg-gradient-to-br from-emerald-600/30 via-card to-emerald-500/10 border-2 border-emerald-500 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] translate-y-[-2px]"
                  : "bg-card/60 text-muted-foreground border border-border hover:border-emerald-500/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === "design" ? "bg-emerald-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-muted"}`}>
                  <Wand2 size={20} />
                </div>
                <Badge variant={activeTab === "design" ? "default" : "outline"} className={`text-[10px] ${activeTab === "design" ? "bg-emerald-500 text-slate-950 font-extrabold" : "border-emerald-500/30 text-emerald-400"}`}>
                  چیدمان با عکس
                </Badge>
              </div>
              <div>
                <h3 className="font-extrabold text-sm mb-1 text-foreground">۱. طراحی و چیدمان با عکس</h3>
                <p className="text-[11px] opacity-80 line-clamp-2">آپلود عکس اتاق، انتخاب محصولات و چیدمان خودکار در جای دقیق</p>
              </div>
            </button>

            {/* TAB 2: Visual AI Scanner & Placement */}
            <button
              onClick={() => setActiveTab("inspiration")}
              className={`text-right p-4 rounded-xl flex flex-col justify-between gap-3 transition-all duration-300 ${
                activeTab === "inspiration"
                  ? "bg-gradient-to-br from-emerald-600/30 via-card to-emerald-500/10 border-2 border-emerald-500 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] translate-y-[-2px]"
                  : "bg-card/60 text-muted-foreground border border-border hover:border-emerald-500/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === "inspiration" ? "bg-emerald-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-muted"}`}>
                  <Search size={20} />
                </div>
                <Badge variant={activeTab === "inspiration" ? "default" : "outline"} className={`text-[10px] ${activeTab === "inspiration" ? "bg-emerald-500 text-slate-950 font-extrabold" : "border-emerald-500/30 text-emerald-400"}`}>
                  اسکن و جایگذاری
                </Badge>
              </div>
              <div>
                <h3 className="font-extrabold text-sm mb-1 text-foreground">۲. اسکن و تشخیص بصری اشیاء</h3>
                <p className="text-[11px] opacity-80 line-clamp-2">اسکن تصویر مدل، یافتن محصول از دیتابیس هومینو و جایگذاری در عکس اتاق شما</p>
              </div>
            </button>

            {/* TAB 3: AI Suggestion Assistant */}
            <button
              onClick={() => setActiveTab("suggest")}
              className={`text-right p-4 rounded-xl flex flex-col justify-between gap-3 transition-all duration-300 ${
                activeTab === "suggest"
                  ? "bg-gradient-to-br from-emerald-600/30 via-card to-emerald-500/10 border-2 border-emerald-500 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] translate-y-[-2px]"
                  : "bg-card/60 text-muted-foreground border border-border hover:border-emerald-500/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === "suggest" ? "bg-emerald-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-muted"}`}>
                  <Sparkles size={20} />
                </div>
                <Badge variant={activeTab === "suggest" ? "default" : "outline"} className={`text-[10px] ${activeTab === "suggest" ? "bg-emerald-500 text-slate-950 font-extrabold" : "border-emerald-500/30 text-emerald-400"}`}>
                  دستیار پیشنهاد
                </Badge>
              </div>
              <div>
                <h3 className="font-extrabold text-sm mb-1 text-foreground">۳. دستیار پیشنهاد دکوراسیون</h3>
                <p className="text-[11px] opacity-80 line-clamp-2">دریافت پیشنهادات هوشمند ست مبلمان بر اساس نوع فضا و بودجه</p>
              </div>
            </button>

          </div>
        </section>

        {/* ── ACTIVE MODULE CONTENT ───────────────────────────── */}

        {/* ── TAB 3: SUGGESTION ASSISTANT MODULE ── */}
        {activeTab === "suggest" && (
          <div className="rounded-3xl p-6 md:p-8 max-w-3xl mx-auto my-6 space-y-6 bg-card/90 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="text-center max-w-lg mx-auto space-y-2">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30">
                دستیار پیشنهاد دکوراسیون
              </span>
              <h2 className="text-2xl font-black text-foreground">پیشنهاد هوشمند ست دکوراسیون</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                به چند سؤال پاسخ دهید تا محصولات متناسب با فضا و بودجه شما از کاتالوگ دیتابیس هومینو انتخاب شوند
              </p>
            </div>

            <AISuggestionAssistant
              onBack={() => setActiveTab("design")}
              onComplete={(params) => {
                setStyle(params.style);
                const budgetMap: Record<string, string> = {
                  low: "10000000", mid: "50000000", high: "100000000", premium: "500000000",
                };
                setBudget(budgetMap[params.budget] || "");
                trackEvent("ai_suggestion_requested", {
                  metadata: { room_type: params.roomType, style: params.style, budget: params.budget },
                });
                setActiveTab("design");
                toast.success("پیشنهادات هوشمند بر اساس فضا و بودجه شما اعمال گردید");
              }}
            />
          </div>
        )}

        {/* ── TAB 2: VISUAL SCAN & PLACEMENT MODULE ── */}
        {activeTab === "inspiration" && (
          <div className="rounded-3xl p-6 md:p-8 max-w-5xl mx-auto my-6 bg-card/90 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <InspirationFlow
              onProceedToDesign={(productsMatch: ProductMatch[], _totalPrice: number, roomPhotoBase64?: string | null) => {
                const sel: Record<string, Product> = {};
                productsMatch.forEach((p) => {
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
                if (roomPhotoBase64) {
                  setImageBase64(roomPhotoBase64);
                }
                setActiveTab("design");
                toast.success(
                  roomPhotoBase64
                    ? `${productsMatch.length} محصول پیدا شده و عکس خانه شما برای جایگذاری بارگذاری گردیدند`
                    : `${productsMatch.length} محصول پیدا شده به محیط چیدمان منتقل گردیدند`
                );
              }}
              onBack={() => setActiveTab("design")}
            />
          </div>
        )}

        {/* ── TAB 1: SMART ROOM STAGING MODULE ── */}
        {activeTab === "design" && (
          <div className="space-y-6">

            {/* Selected products indicator banner */}
            {selectedList.length > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 max-w-4xl mx-auto shadow-sm">
                <div className="flex items-center gap-3">
                  <Sofa size={20} className="text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-400">{selectedList.length} محصول</span>
                    <span className="text-muted-foreground"> از دیتابیس برای جایگذاری آماده است.</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gold">{fmt(total)}</span>
                  <button onClick={() => setSelected({})} className="text-xs text-muted-foreground hover:text-foreground">
                    پاک‌سازی
                  </button>
                </div>
              </div>
            )}

            <div className={`grid gap-6 ${geminiResult?.status === "ok" ? "lg:grid-cols-[1fr_340px]" : "grid-cols-1"}`}>

              {/* MAIN STAGING PANEL */}
              <div className="space-y-6 min-w-0">

                {/* 1. Upload Box */}
                {!imageBase64 && !loading && (
                  <div className="rounded-3xl p-8 text-center max-w-2xl mx-auto cursor-pointer border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-card/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                      <Upload size={26} className="animate-bounce" />
                    </div>
                    <h3 className="text-lg font-black text-foreground mb-1">تصویر فضای خانه خود را آپلود کنید</h3>
                    <p className="text-xs text-muted-foreground mb-4">کلیک کنید یا تصویر را بکشید (JPG, PNG - حداکثر ۵ مگابایت)</p>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>
                )}

                {/* Image preview */}
                {imageBase64 && !loading && (
                  <div className="max-w-2xl mx-auto">
                    <div className="relative rounded-3xl overflow-hidden bg-card border border-emerald-500/40 shadow-2xl group">
                      <img src={imageBase64} alt="فضای خانه" className="w-full aspect-video object-cover" />
                      <button onClick={() => { setImageBase64(null); setGeminiResult(null); }}
                        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center border border-border hover:bg-background transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Style Pills */}
                <div className="rounded-2xl p-4 max-w-3xl mx-auto bg-card/90 border border-border">
                  <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Compass size={14} className="text-emerald-400" /> انتخاب سبک دکوراسیون
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => (
                      <button key={s.id} onClick={() => setStyle(s.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          style === s.id
                            ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-md scale-105"
                            : "bg-card text-muted-foreground border-border hover:border-emerald-500/40"
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Catalog Grid */}
                {!loading && (
                  <div className="rounded-3xl p-5 space-y-4 bg-card/90 border border-border">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ShoppingBag size={15} className="text-emerald-400" /> کاتالوگ محصولات دیتابیس هومینو
                      </p>
                      <span className="text-xs text-muted-foreground">
                        برای چیدمان، روی وسایل کلیک کنید
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
                      {CATEGORIES.map((c) => {
                        const sel = selectedList.filter((p) => p.category_id === catMap[c.slug]).length;
                        const isActive = activeCat === c.slug;
                        const Icon = c.Icon;
                        return (
                          <button key={c.slug} onClick={() => setActiveCat(c.slug)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                              isActive
                                ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:border-emerald-500/40"
                            }`}>
                            <Icon size={14} />
                            {c.label}
                            {sel > 0 && <span className="bg-gold text-charcoal text-[10px] px-1.5 py-0.2 rounded-full font-black">{sel}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {currentProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">محصولی در این دسته یافت نشد.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[360px] overflow-y-auto p-1">
                        {currentProducts.map((p) => {
                          const isSel = !!selected[p.id];
                          return (
                            <button key={p.id} onClick={() => toggleProduct(p)}
                              className={`relative text-right rounded-2xl border overflow-hidden transition-all bg-card ${
                                isSel ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-md scale-[1.02]" : "border-border hover:border-emerald-500/40"
                              }`}>
                              <div className="aspect-square bg-muted overflow-hidden">
                                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                              </div>
                              <div className="p-2.5">
                                <p className="text-xs font-bold line-clamp-1">{p.name}</p>
                                <p className="text-xs text-emerald-400 font-black mt-1">{fmt(p.price)}</p>
                              </div>
                              {isSel && (
                                <div className="absolute top-2 left-2">
                                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                                    <CheckCircle2 size={12} />
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

                {/* Budget & Prompt Input */}
                {!loading && (
                  <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <p className="text-xs font-bold text-muted-foreground mb-1.5">سقف بودجه مدنظر (اختیاری)</p>
                      <div className="relative">
                        <input type="text" inputMode="numeric" value={budget}
                          onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="مثلاً: ۵۰۰۰۰۰۰" dir="ltr"
                          className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">تومان</span>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <p className="text-xs font-bold text-muted-foreground mb-1.5">توضیحات اختصاصی (اختیاری)</p>
                      <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                        placeholder="مثلاً: مبل جلو پنجره باشد..."
                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                {!loading && !geminiResult && (
                  <div className="text-center pt-2">
                    <button onClick={generate}
                      disabled={!imageBase64 || selectedList.length === 0}
                      className="btn-3d text-base font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-2 w-full max-w-lg mx-auto shadow-luxury bg-emerald-600 hover:bg-emerald-500 text-white">
                      <Wand2 size={18} />
                      چیدمان هوشمند با هومینو استودیو
                    </button>
                  </div>
                )}

                {/* Loading state progress */}
                {loading && (
                  <div className="max-w-md mx-auto">
                    <AIDesignProgress steps={progressSteps} currentLabel={STAGE_CONFIG[currentStage]?.label} />
                  </div>
                )}

                {/* Error handling */}
                {aiError && !loading && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm flex items-start gap-3 max-w-md mx-auto">
                    <Info size={16} className="shrink-0 mt-0.5 text-destructive" />
                    <div className="flex-1 space-y-2">
                      <p className="text-destructive font-bold">خطا در چیدمان</p>
                      <p className="text-muted-foreground text-xs">{aiError}</p>
                      <button onClick={generate} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline">
                        <RefreshCw size={12} /> تلاش مجدد
                      </button>
                    </div>
                  </div>
                )}

                {/* RESULT CANVAS */}
                {geminiResult && (
                  <div ref={resultRef} className={`space-y-4 transition-all ${fullscreen ? "fixed inset-4 z-50 bg-background overflow-y-auto p-6 rounded-2xl shadow-2xl border border-border" : ""}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-xl text-foreground">نتیجه چیدمان هومینو استودیو</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setFullscreen(!fullscreen)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                          {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>
                        <button onClick={() => {
                          const img = resultRef.current?.querySelector("img");
                          if (img) {
                            const link = document.createElement("a");
                            link.download = "homeino-design.png";
                            link.href = img.src;
                            link.click();
                            toast.success("تصویر ذخیره شد");
                          }
                        }} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                          <Download size={15} />
                        </button>
                        <button onClick={async () => {
                          try {
                            await navigator.share({
                              title: "طراحی هومینو استودیو",
                              text: "چیدمان اتاق من با هومینو استودیو",
                              url: window.location.href,
                            });
                          } catch {
                            navigator.clipboard?.writeText(window.location.href);
                            toast.success("لینک کپی شد");
                          }
                        }} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                          <Share2 size={15} />
                        </button>
                      </div>
                    </div>

                    {geminiResult.status === "ok" && imageBase64 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowBefore(false)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                              !showBefore ? "bg-emerald-500 text-slate-950 border-emerald-500" : "bg-card text-muted-foreground border-border"
                            }`}
                          >
                            نتیجه چیدمان
                          </button>
                          <button
                            onClick={() => setShowBefore(true)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                              showBefore ? "bg-emerald-500 text-slate-950 border-emerald-500" : "bg-card text-muted-foreground border-border"
                            }`}
                          >
                            تصویر اولیه
                          </button>
                        </div>

                        <div className="rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-card">
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
                      className="w-full bg-card border border-border hover:border-emerald-500 text-foreground py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-sm">
                      <RefreshCw size={16} /> چیدمان مجدد
                    </button>

                    {/* Analytics / Consultations tabs */}
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-2 bg-card border border-border rounded-2xl p-1.5">
                        <button onClick={() => setAnalyticsTab("consultation")}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                            analyticsTab === "consultation" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-muted-foreground"
                          }`}>
                          <Lightbulb size={14} /> مشاوره هومینو استودیو
                        </button>
                        <button onClick={() => setAnalyticsTab("placements")}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                            analyticsTab === "placements" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-muted-foreground"
                          }`}>
                          <Layers size={14} /> وسایل جایگذاری شده ({geminiResult.placements.length})
                        </button>
                      </div>

                      {analyticsTab === "consultation" && (
                        <div className="rounded-2xl p-5 space-y-3 bg-card border border-border">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Palette size={16} className="text-emerald-400 shrink-0" />
                            <span className="text-xs font-bold text-emerald-400">سبک انتخاب شده:</span>
                            <Badge variant="secondary" className="text-xs font-bold">{STYLES.find((s) => s.id === style)?.label || style}</Badge>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{geminiResult.consultation}</p>
                          <div className="flex items-center gap-2 pt-3 border-t border-border">
                            <Banknote size={15} className="text-gold shrink-0" />
                            <span className="text-xs text-muted-foreground">جمع کل فاکتور دیتابیس:</span>
                            <span className="text-base font-black text-gold">{fmt(geminiResult.totalPrice)}</span>
                          </div>
                        </div>
                      )}

                      {analyticsTab === "placements" && (
                        <div className="space-y-2">
                          {geminiResult.placements.map((pl) => {
                            const product = pl.product;
                            return (
                              <div key={pl.product_id} className="bg-card border border-border rounded-2xl p-3 flex gap-3 items-center">
                                <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0">
                                  {product.image_url && <img src={product.image_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold line-clamp-1">{product.name}</p>
                                  <p className="text-xs text-emerald-400 font-black mt-1">{fmt(product.price)}</p>
                                </div>
                                <button onClick={() => addToCart(product)}
                                  className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors shrink-0" title="افزودن به سبد خرید">
                                  <ShoppingCart size={15} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>

              {/* SIDEBAR SUMMARY */}
              {!geminiResult && (
                <div className="space-y-4">
                  <div className="rounded-3xl p-5 bg-card/90 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-extrabold text-sm flex items-center gap-2">
                        <ShoppingCart size={18} className="text-emerald-400" /> سبد وسایل طرح ({selectedList.length})
                      </h3>
                      {selectedList.length > 0 && (
                        <button onClick={() => setSelected({})} className="text-xs text-muted-foreground hover:text-foreground">
                          پاک کردن
                        </button>
                      )}
                    </div>

                    {selectedList.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4">هنوز محصولی انتخاب نشده است.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {selectedList.map((p) => {
                          const qty = quantities[p.id] || 1;
                          return (
                            <div key={p.id} className="flex items-center gap-2.5 text-xs bg-muted/40 p-2 rounded-xl border border-border">
                              <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                                {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="line-clamp-1 font-bold text-xs">{p.name}</p>
                                <p className="text-emerald-400 text-xs font-bold mt-0.5">{fmt((p.price || 0) * qty)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setQuantity(p.id, qty + 1)} className="w-5 h-5 rounded bg-card flex items-center justify-center font-bold text-[10px] hover:bg-emerald-500 hover:text-slate-950">+</button>
                                <span className="text-[10px] font-black w-4 text-center">{qty}</span>
                                <button onClick={() => qty > 1 ? setQuantity(p.id, qty - 1) : toggleProduct(p)} className="w-5 h-5 rounded bg-card flex items-center justify-center font-bold text-[10px] hover:bg-emerald-500 hover:text-slate-950">-</button>
                              </div>
                              <button onClick={() => toggleProduct(p)} className="text-muted-foreground hover:text-destructive shrink-0">
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedList.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-semibold">مجموع فاکتور</span>
                        <span className="font-black text-gold text-sm">{fmt(total)}</span>
                      </div>
                    )}
                  </div>

                  {/* Trust indicator */}
                  <div className="p-4 rounded-2xl bg-card/60 border border-border text-center space-y-1.5">
                    <ShieldCheck size={20} className="mx-auto text-emerald-400" />
                    <p className="text-xs font-bold text-foreground">تضمین قیمت دیتابیس هومینو</p>
                    <p className="text-[11px] text-muted-foreground">تمامی قیمت‌ها مستقیم از دیتابیس کاتالوگ استخراج می‌گردند</p>
                  </div>
                </div>
              )}

            </div>

            {/* Floating selected items panel */}
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

          </div>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default AIDesign;
