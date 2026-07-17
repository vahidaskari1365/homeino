import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Wand2, Search, Sparkles, RefreshCw,
  ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers,
  CheckCircle2, Banknote, Info, Maximize2, Minimize2, Download, Share2,
  Sofa, Blinds, Grid3x3, Lamp, BedDouble, Flower2, Image as ImageIcon, TreePine, Gem,
  Compass, ShieldCheck, Cpu, Coins, Eye, CheckSquare,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
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

  // Active mode state
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
  const [catalogQuery, setCatalogQuery]   = useState("");

  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const resultRef     = useRef<HTMLDivElement>(null);
  const { addItem, setOpen: setOpenCart } = useCart();

  const { tokenBalance, freeDesignsRemaining, consumeDesignCredit } = useTokens();

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

  const currentProducts = useMemo(() => products[activeCat] || [], [products, activeCat]);

  const filteredCurrentProducts = useMemo(() => {
    if (!catalogQuery.trim()) return currentProducts;
    return currentProducts.filter((p) => p.name.toLowerCase().includes(catalogQuery.trim().toLowerCase()));
  }, [currentProducts, catalogQuery]);

  const allFilteredSelected = useMemo(() => {
    if (filteredCurrentProducts.length === 0) return false;
    return filteredCurrentProducts.every((p) => !!selected[p.id]);
  }, [filteredCurrentProducts, selected]);

  const handleSelectAllCategory = () => {
    const next = { ...selected };
    const nextQ = { ...quantities };
    filteredCurrentProducts.forEach((p) => {
      next[p.id] = p;
      if (!nextQ[p.id]) nextQ[p.id] = 1;
    });
    setSelected(next);
    setQuantities(nextQ);
    toast.success(`تمامی ${filteredCurrentProducts.length} محصول این دسته انتخاب شدند`);
  };

  const handleDeselectCategory = () => {
    const next = { ...selected };
    const nextQ = { ...quantities };
    filteredCurrentProducts.forEach((p) => {
      delete next[p.id];
      delete nextQ[p.id];
    });
    setSelected(next);
    setQuantities(nextQ);
    toast.info(`انتخاب‌های این دسته لغو گردیدند`);
  };

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

  const progressSteps: ProgressStep[] = STAGES.map((s) => ({
    key: s,
    label: STAGE_CONFIG[s].label,
    done: STAGES.indexOf(s) < STAGES.indexOf(currentStage) || (s === currentStage && s === "RENDERING" && geminiResult?.status === "ok"),
    active: s === currentStage && !(s === "RENDERING" && geminiResult?.status === "ok"),
  }));

  return (
    <div className="min-h-screen bg-[#080d0a] text-slate-100 relative overflow-hidden font-body" dir="rtl">
      <Navbar />

      {/* Cybernetic Emerald Glow Atmosphere & Laser Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <main className="container mx-auto px-4 pt-28 pb-16 relative z-10 stage-3d-container max-w-7xl">

        {/* ── HIGH-TECH STUDIO HUD COMMAND BAR ───────────────────── */}
        <header className="mb-8 p-4 md:p-6 rounded-3xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-emerald-500/20 pb-4">
            
            {/* Left Status Indicator */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Cpu size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <h1 className="text-lg md:text-xl font-black text-white tracking-wide">
                    هومینو استودیو Pro <span className="text-emerald-400 font-bold text-xs bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/40">Studio Engine</span>
                  </h1>
                </div>
                <p className="text-xs text-slate-400">طراحی چیدمان، اسکن هوشمند مدل‌ها و رندر هوش مصنوعی</p>
              </div>
            </div>

            {/* Right Token Badge & Workflow Tracker */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-emerald-500/30 text-xs">
                <Coins size={14} className="text-emerald-400" />
                <span className="text-slate-300">اعتبار طراحی:</span>
                <span className="font-black text-emerald-400">{tokenBalance ?? freeDesignsRemaining}</span>
                <Link to="/subscription" className="text-[10px] text-emerald-400 hover:underline mr-1 font-bold">
                  + شارژ
                </Link>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold bg-slate-950/60 p-1 rounded-xl border border-border">
                <span className={`px-2.5 py-1 rounded-lg ${activeTab === "design" ? "bg-emerald-500 text-slate-950" : "text-slate-400"}`}>۱. چیدمان</span>
                <span className="text-slate-600">➔</span>
                <span className={`px-2.5 py-1 rounded-lg ${activeTab === "inspiration" ? "bg-emerald-500 text-slate-950" : "text-slate-400"}`}>۲. اسکن</span>
                <span className="text-slate-600">➔</span>
                <span className={`px-2.5 py-1 rounded-lg ${activeTab === "suggest" ? "bg-emerald-500 text-slate-950" : "text-slate-400"}`}>۳. پیشنهاد</span>
              </div>
            </div>

          </div>

          {/* ── 3D STUDIO GLOWING NAVIGATION TABS ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
            
            {/* TAB 1: Smart Staging */}
            <button
              onClick={() => setActiveTab("design")}
              className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 text-right ${
                activeTab === "design"
                  ? "bg-gradient-to-r from-emerald-600/30 via-emerald-900/40 to-emerald-500/10 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                  : "bg-slate-950/40 border border-slate-800 text-slate-400 hover:border-emerald-500/40 hover:text-slate-200"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === "design" ? "bg-emerald-500 text-slate-950 font-black shadow-lg" : "bg-slate-800"}`}>
                <Wand2 size={18} />
              </div>
              <div>
                <p className="font-black text-xs text-white">۱. استودیوی چیدمان و رندر تصویر</p>
                <p className="text-[10px] opacity-70 line-clamp-1">آپلود عکس اتاق + انتخاب محصولات کاتالوگ</p>
              </div>
            </button>

            {/* TAB 2: Visual AI Scanner */}
            <button
              onClick={() => setActiveTab("inspiration")}
              className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 text-right ${
                activeTab === "inspiration"
                  ? "bg-gradient-to-r from-emerald-600/30 via-emerald-900/40 to-emerald-500/10 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                  : "bg-slate-950/40 border border-slate-800 text-slate-400 hover:border-emerald-500/40 hover:text-slate-200"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === "inspiration" ? "bg-emerald-500 text-slate-950 font-black shadow-lg" : "bg-slate-800"}`}>
                <Search size={18} />
              </div>
              <div>
                <p className="font-black text-xs text-white">۲. اسکنر تصویری و جایگزینی مدل</p>
                <p className="text-[10px] opacity-70 line-clamp-1">اسکن عکس الهام + جایگذاری روی عکس خانه شما</p>
              </div>
            </button>

            {/* TAB 3: AI Advisor */}
            <button
              onClick={() => setActiveTab("suggest")}
              className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 text-right ${
                activeTab === "suggest"
                  ? "bg-gradient-to-r from-emerald-600/30 via-emerald-900/40 to-emerald-500/10 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                  : "bg-slate-950/40 border border-slate-800 text-slate-400 hover:border-emerald-500/40 hover:text-slate-200"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === "suggest" ? "bg-emerald-500 text-slate-950 font-black shadow-lg" : "bg-slate-800"}`}>
                <Sparkles size={18} />
              </div>
              <div>
                <p className="font-black text-xs text-white">۳. دستیار هوشمند پیشنهاد دکور</p>
                <p className="text-[10px] opacity-70 line-clamp-1">پیشنهاد اتوماتیک ست مبلمان براساس بودجه و سبک</p>
              </div>
            </button>

          </div>
        </header>

        {/* ── TAB 3: SUGGESTION ASSISTANT ── */}
        {activeTab === "suggest" && (
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl max-w-4xl mx-auto space-y-6">
            <div className="text-center max-w-md mx-auto space-y-2">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30">
                دستیار پیشنهاد دکوراسیون
              </span>
              <h2 className="text-2xl font-black text-white">پیشنهاد هوشمند ست دکوراسیون</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                پاسخ به چند سؤال کوتاه برای انتخاب خودکار محصولات از دیتابیس هومینو
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
                toast.success("تنظیمات و پیشنهادات هوشمند در استودیوی چیدمان اعمال گردیدند");
              }}
            />
          </div>
        )}

        {/* ── TAB 2: VISUAL SCANNER MODULE ── */}
        {activeTab === "inspiration" && (
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl max-w-5xl mx-auto">
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

        {/* ── TAB 1: SMART STAGING WORKBENCH ── */}
        {activeTab === "design" && (
          <div className="space-y-6">

            {/* Selection Banner */}
            {selectedList.length > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <Sofa size={22} className="text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-extrabold text-emerald-400">{selectedList.length} محصول</span>
                    <span className="text-slate-300"> از کاتالوگ دیتابیس برای چیدمان انتخاب گردیده است.</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-emerald-300">{fmt(total)}</span>
                  <button onClick={() => setSelected({})} className="text-xs text-slate-400 hover:text-white font-bold">
                    پاک‌سازی کل
                  </button>
                </div>
              </div>
            )}

            <div className={`grid gap-6 ${geminiResult?.status === "ok" ? "lg:grid-cols-[1fr_360px]" : "grid-cols-1 lg:grid-cols-12"}`}>

              {/* MAIN STUDIO VIEWPORT CANVAS (Left/Top) */}
              <div className={`${geminiResult?.status === "ok" ? "" : "lg:col-span-7"} space-y-6 min-w-0`}>

                {/* Photo Upload Viewport Stage */}
                {!imageBase64 && !loading && (
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                    className="relative rounded-3xl p-10 text-center cursor-pointer border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-900/60 backdrop-blur-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.1)] group"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 text-emerald-400 group-hover:scale-110 transition-transform">
                      <Upload size={32} className="animate-bounce" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">تصویر اتاق یا خانه خود را بارگذاری کنید</h3>
                    <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
                      تصویر فضای اتاق نشیمن، خواب، آشپزخانه یا کار را آپلود کنید تا هومینو استودیو جایگاه دقیق مبلمان و وسایل را محاسبه کند.
                    </p>
                    <span className="inline-flex items-center gap-2 bg-emerald-500 text-slate-950 px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg">
                      انتخاب تصویر (JPG/PNG - حداکثر ۵ مگابایت)
                    </span>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>
                )}

                {/* Loaded Room Photo Preview Stage */}
                {imageBase64 && !loading && (
                  <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-emerald-500/40 shadow-2xl group">
                    <img src={imageBase64} alt="اتاق شما" className="w-full aspect-video object-cover" />
                    
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                      <span className="bg-slate-900/80 backdrop-blur border border-emerald-500/30 text-emerald-400 text-[11px] px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 pointer-events-auto">
                        <Eye size={13} /> تصویر آماده رندر چیدمان
                      </span>
                      <button onClick={() => { setImageBase64(null); setGeminiResult(null); }}
                        className="w-8 h-8 rounded-full bg-slate-900/90 border border-white/20 text-white flex items-center justify-center hover:bg-red-500 transition-colors pointer-events-auto">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Style Selector Toolbar */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-xl">
                  <p className="text-xs font-black text-slate-300 mb-3 flex items-center gap-2">
                    <Compass size={15} className="text-emerald-400" /> سبک دکوراسیون چیدمان
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => (
                      <button key={s.id} onClick={() => setStyle(s.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          style === s.id
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105"
                            : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-emerald-500/40 hover:text-white"
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget & Prompt Dock */}
                {!loading && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                      <p className="text-xs font-bold text-slate-300 mb-2">سقف بودجه چیدمان (تومان)</p>
                      <input type="text" inputMode="numeric" value={budget}
                        onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="مثلاً: ۵۰۰۰۰۰۰" dir="ltr"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                      <p className="text-xs font-bold text-slate-300 mb-2">دستور سفارشی جانبی (اختیاری)</p>
                      <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                        placeholder="مثلاً: مبل نزدیک پنجره باشد..."
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  </div>
                )}

                {/* Main Render Action Button */}
                {!loading && !geminiResult && (
                  <button onClick={generate}
                    disabled={!imageBase64 || selectedList.length === 0}
                    className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-slate-950 font-black text-sm md:text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-40 hover:opacity-95 transition-all">
                    <Wand2 size={20} />
                    شروع رندرگیری و چیدمان هوشمند با هومینو استودیو
                  </button>
                )}

                {/* Loading Progress */}
                {loading && (
                  <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/40 backdrop-blur-2xl">
                    <AIDesignProgress steps={progressSteps} currentLabel={STAGE_CONFIG[currentStage]?.label} />
                  </div>
                )}

                {/* Error handling */}
                {aiError && !loading && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 text-xs flex items-start gap-3 text-red-300">
                    <Info size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <div className="flex-1 space-y-2">
                      <p className="font-bold">خطا در رندر چیدمان</p>
                      <p className="text-slate-400">{aiError}</p>
                      <button onClick={generate} className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:underline">
                        <RefreshCw size={12} /> تلاش مجدد
                      </button>
                    </div>
                  </div>
                )}

                {/* Rendered Result Output Stage */}
                {geminiResult && (
                  <div ref={resultRef} className={`space-y-4 transition-all ${fullscreen ? "fixed inset-4 z-50 bg-slate-950 overflow-y-auto p-6 rounded-3xl shadow-2xl border border-emerald-500/40" : ""}`}>
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <h3 className="font-black text-lg text-emerald-400">نتیجه چیدمان هوشمند هومینو استودیو</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setFullscreen(!fullscreen)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white">
                          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                        <button onClick={() => {
                          const img = resultRef.current?.querySelector("img");
                          if (img) {
                            const link = document.createElement("a");
                            link.download = "homeino-studio-design.png";
                            link.href = img.src;
                            link.click();
                            toast.success("تصویر خروجی ذخیره گردید");
                          }
                        }} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white">
                          <Download size={14} />
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
                        }} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white">
                          <Share2 size={14} />
                        </button>
                      </div>
                    </div>

                    {geminiResult.status === "ok" && imageBase64 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowBefore(false)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                              !showBefore ? "bg-emerald-500 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            نتیجه رندر چیدمان
                          </button>
                          <button
                            onClick={() => setShowBefore(true)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                              showBefore ? "bg-emerald-500 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            تصویر اولیه اتاق
                          </button>
                        </div>

                        <div className="rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-slate-950">
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
                      className="w-full bg-slate-900 border border-emerald-500/30 hover:border-emerald-400 text-white py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all">
                      <RefreshCw size={15} /> چیدمان مجدد AI
                    </button>

                    {/* Consultation & Placements tabs */}
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-emerald-500/20">
                        <button onClick={() => setAnalyticsTab("consultation")}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            analyticsTab === "consultation" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
                          }`}>
                          <Lightbulb size={13} className="inline ml-1" /> مشاوره چیدمان
                        </button>
                        <button onClick={() => setAnalyticsTab("placements")}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            analyticsTab === "placements" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
                          }`}>
                          <Layers size={13} className="inline ml-1" /> وسایل فاکتور ({geminiResult.placements.length})
                        </button>
                      </div>

                      {analyticsTab === "consultation" && (
                        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/20 space-y-3 text-xs">
                          <p className="leading-relaxed text-slate-200 whitespace-pre-wrap">{geminiResult.consultation}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <span className="text-slate-400">جمع کل فاکتور دیتابیس:</span>
                            <span className="text-sm font-black text-emerald-400">{fmt(geminiResult.totalPrice)}</span>
                          </div>
                        </div>
                      )}

                      {analyticsTab === "placements" && (
                        <div className="space-y-2">
                          {geminiResult.placements.map((pl) => {
                            const product = pl.product;
                            return (
                              <div key={pl.product_id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex gap-3 items-center">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                                  {product.image_url && <img src={product.image_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold line-clamp-1 text-white">{product.name}</p>
                                  <p className="text-xs text-emerald-400 font-bold">{fmt(product.price)}</p>
                                </div>
                                <button onClick={() => addToCart(product)}
                                  className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors">
                                  <ShoppingCart size={14} />
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

              {/* MULTI-SELECT CATALOG CONTROL DOCK (Right/Bottom) */}
              {!geminiResult && (
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* Multi-Select Catalog Block */}
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-2xl shadow-xl space-y-4">
                    
                    {/* Header Controls */}
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-500/20 pb-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag size={18} className="text-emerald-400" />
                        <div>
                          <h3 className="text-sm font-black text-white">کاتالوگ محصولات دیتابیس هومینو</h3>
                          <p className="text-[10px] text-emerald-400 font-bold">انتخاب چندتایی (Multi-Select) فعال</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {allFilteredSelected ? (
                          <button
                            onClick={handleDeselectCategory}
                            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-bold transition-all"
                          >
                            لغو این دسته
                          </button>
                        ) : (
                          <button
                            onClick={handleSelectAllCategory}
                            className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1"
                          >
                            <CheckSquare size={12} /> انتخاب همگی ({filteredCurrentProducts.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Nav & Search Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {CATEGORIES.map((c) => {
                          const sel = selectedList.filter((p) => p.category_id === catMap[c.slug]).length;
                          const isActive = activeCat === c.slug;
                          const Icon = c.Icon;
                          return (
                            <button key={c.slug} onClick={() => setActiveCat(c.slug)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all ${
                                isActive
                                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md"
                                  : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-emerald-500/40 hover:text-white"
                              }`}>
                              <Icon size={13} />
                              {c.label}
                              {sel > 0 && <span className="bg-emerald-300 text-slate-950 text-[9px] px-1 rounded-full font-black">{sel}</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick Search */}
                      <div className="relative">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={catalogQuery}
                          onChange={(e) => setCatalogQuery(e.target.value)}
                          placeholder="جستجوی سریع محصولات..."
                          className="w-full pr-8 pl-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                        />
                        {catalogQuery && (
                          <button onClick={() => setCatalogQuery("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Product Grid */}
                    {filteredCurrentProducts.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">محصولی در این بخش یافت نشد.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {filteredCurrentProducts.map((p) => {
                          const isSel = !!selected[p.id];
                          return (
                            <button key={p.id} onClick={() => toggleProduct(p)}
                              className={`relative text-right rounded-2xl border overflow-hidden transition-all bg-slate-950 group ${
                                isSel
                                  ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg bg-emerald-500/10 scale-[1.02]"
                                  : "border-slate-800 hover:border-emerald-500/40"
                              }`}>
                              <div className="aspect-square bg-slate-900 overflow-hidden relative">
                                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                                <div className="absolute top-1.5 left-1.5 z-10">
                                  {isSel ? (
                                    <span className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow">
                                      <CheckCircle2 size={13} />
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-md bg-black/50 backdrop-blur text-white/60 flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                      +
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="p-2">
                                <p className="text-[11px] font-bold line-clamp-1 text-slate-200">{p.name}</p>
                                <p className="text-[11px] text-emerald-400 font-black mt-0.5">{fmt(p.price)}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Trust & Database Guarantee */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                    <ShieldCheck size={18} className="mx-auto text-emerald-400" />
                    <p className="text-xs font-bold text-slate-200">تضمین استخراج مستقیم قیمت از Supabase DB</p>
                    <p className="text-[10px] text-slate-400">قیمت فاکتور دقیقاً بر اساس کاتالوگ فروشندگان محاسبه می‌گردد</p>
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
