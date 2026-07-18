import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Wand2, Search, Sparkles, RefreshCw,
  ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers,
  CheckCircle2, Banknote, Info, Maximize2, Minimize2, Download, Share2,
  Sofa, Blinds, Grid3x3, Lamp, BedDouble, Flower2, Image as ImageIcon,
  Gem, Compass, ShieldCheck, ChevronDown, ChevronUp, Tv, BookOpen,
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

// Style preview images imported from assets
import styleModern from "@/assets/hero-cinematic-living.jpg";
import styleClassic from "@/assets/inspiration-classic.jpg";
import styleMinimalist from "@/assets/hero-living.jpg";
import styleLuxury from "@/assets/hero-cinematic-bedroom.jpg";
import styleScandi from "@/assets/board/b-bedroom.jpg";
import styleIndustrial from "@/assets/board/b-office.jpg";
import styleBoho from "@/assets/board/b-decor.jpg";
import styleJapandi from "@/assets/hero-cinematic-kitchen.jpg";

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

// Style list with high quality visual preview cards
const STYLES = [
  { id: "modern",       label: "مدرن",        image: styleModern,     desc: "خطوط صاف، سادگی و کارایی بالا" },
  { id: "classic",      label: "کلاسیک",      image: styleClassic,    desc: "نقش‌ونگارهای مجلل و پارچه‌های باشکوه" },
  { id: "minimalist",   label: "مینیمال",     image: styleMinimalist, desc: "خلوتی فضا، رنگ‌های خنثی و آرامش" },
  { id: "luxury",       label: "لوکس",        image: styleLuxury,     desc: "جزئیات طلایی، مرمر و مخمل اعلا" },
  { id: "scandinavian", label: "اسکاندیناوی", image: styleScandi,     desc: "چوب‌های روشن، نور زیاد و حس گرم" },
  { id: "industrial",   label: "صنعتی",       image: styleIndustrial, desc: "آجر، فلز سیاه و چوب زمخت" },
  { id: "bohemian",     label: "بوهمی",       image: styleBoho,       desc: "بافت‌های سنتی، گیاهان و پالت گرم" },
  { id: "japanese",     label: "ژاپنی (جپندی)", image: styleJapandi,   desc: "تعادل شرقی، سادگی چوبی و تقارن" },
];

// Interactive categories with detailed sub-type variations
export interface CategoryDef {
  slug: string;
  label: string;
  Icon: LucideIcon;
  subTypes: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    slug: "furniture",
    label: "مبلمان",
    Icon: Sofa,
    subTypes: ["مبل ال", "مبل تدی / پارچه‌ای", "مبل چسترفیلد", "مبل کلاسیک و سلطنتی", "صندلی راحتی تک‌نفره", "پاف و اتومان"],
  },
  {
    slug: "dining",
    label: "میز ناهارخوری",
    Icon: ShoppingBag,
    subTypes: ["۴ نفره", "۶ نفره", "۸ نفره", "۲ نفره", "گرد", "مستطیل", "بیضی"],
  },
  {
    slug: "curtain",
    label: "پرده",
    Icon: Blinds,
    subTypes: ["پرده پانچی مدرن", "پرده شید و زبرا", "پرده مخمل کلاسیک", "تور و حریر سبک"],
  },
  {
    slug: "carpet",
    label: "فرش و کف‌پوش",
    Icon: Grid3x3,
    subTypes: ["فرش ماشینی مدرن", "فرش دستبافت ایرانی", "فرش وینتیج / کهنه‌نما", "گلیم و جاجیم"],
  },
  {
    slug: "lighting",
    label: "روشنایی و آباژور",
    Icon: Lamp,
    subTypes: ["آباژور ایستاده", "آباژور رومیزی", "لوستر سقفی و آویز", "چراغ دیوارکوب"],
  },
  {
    slug: "tv-console",
    label: "میز TV و کنسول",
    Icon: Tv,
    subTypes: ["میز تلویزیون مدرن", "میز کنسول چوبی", "میز جلومبلی و عسلی"],
  },
  {
    slug: "bookcase-shoe",
    label: "کتابخانه و جاکفشی",
    Icon: BookOpen,
    subTypes: ["جاکفشی مدرن", "کتابخانه طبقاتی", "شلف دکوراتیو دیواری"],
  },
  {
    slug: "bedding",
    label: "تخت و سرویس خواب",
    Icon: BedDouble,
    subTypes: ["تخت دوپشت لمسه‌دوزی", "پاتختی مدرن", "سرویس خواب چوبی"],
  },
  {
    slug: "plants",
    label: "گل و گیاه",
    Icon: Flower2,
    subTypes: ["گیاهان آپارتمانی بزرگ (سانسوریا/فیکوس)", "گلدان ایستاده", "گیاهان تزئینی رومیزی"],
  },
  {
    slug: "art",
    label: "تابلو نقاشی و آینه",
    Icon: ImageIcon,
    subTypes: ["تابلو بوم انتزاعی", "ست تابلو چندتایی", "آینه دکوراتیو"],
  },
  {
    slug: "accessories",
    label: "اکسسوری و دکوراتیو",
    Icon: Gem,
    subTypes: ["شمع و شمعدان", "مجسمه دکوراتیو", "گلدان شیشه‌ای کریستال"],
  },
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

  // Active Tab Mode
  const [activeTab, setActiveTab] = useState<"design" | "inspiration" | "suggest">(
    searchParams.get("mode") === "inspiration"
      ? "inspiration"
      : searchParams.get("mode") === "suggest"
      ? "suggest"
      : "design"
  );

  // Core State
  const [imageBase64, setImageBase64]     = useState<string | null>(null);
  const [style, setStyle]                 = useState("modern");
  const [prompt, setPrompt]               = useState("");
  const [budget, setBudget]               = useState("");
  const [loading, setLoading]             = useState(false);
  const [currentStage, setCurrentStage]   = useState<DesignStage>("UPLOADING");
  const [geminiResult, setGeminiResult]   = useState<PipelineResult<Product> | null>(null);
  const [aiError, setAiError]             = useState<string | null>(null);

  // Multi-Select Categories & Accordion Drawer
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({
    furniture: true, // furniture default enabled
  });
  const [expandedCat, setExpandedCat]   = useState<string | null>("furniture");
  const [selectedSubTypes, setSelectedSubTypes] = useState<Record<string, string[]>>({});

  // Products database catalog
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

  // Toggle Category selection (Multi-Select)
  const toggleCategorySelection = (catSlug: string) => {
    setSelectedCategories((prev) => {
      const nextState = !prev[catSlug];
      const next = { ...prev, [catSlug]: nextState };
      // Expand drawer when turned on
      if (nextState) setExpandedCat(catSlug);
      return next;
    });
  };

  // Toggle SubType filter for a category
  const toggleSubType = (catSlug: string, subType: string) => {
    setSelectedSubTypes((prev) => {
      const list = prev[catSlug] || [];
      const exists = list.includes(subType);
      const updated = exists ? list.filter((s) => s !== subType) : [...list, subType];
      return { ...prev, [catSlug]: updated };
    });
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

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const total        = selectedList.reduce((s, p) => s + (Number(p.price) || 0) * (quantities[p.id] || 1), 0);

  const selectedMap = useMemo(
    () => selectedList.reduce<Record<string, Product>>((acc, p) => { acc[p.id] = p; return acc; }, {}),
    [selectedList]
  );

  // Active Products for current expanded category + subType filter
  const currentCategoryDef = useMemo(() => CATEGORIES.find((c) => c.slug === expandedCat), [expandedCat]);
  const currentRawProducts = useMemo(() => (expandedCat ? products[expandedCat] || [] : []), [products, expandedCat]);

  const activeSubFilters = useMemo(() => (expandedCat ? selectedSubTypes[expandedCat] || [] : []), [selectedSubTypes, expandedCat]);

  const filteredCurrentProducts = useMemo(() => {
    let list = currentRawProducts;
    if (activeSubFilters.length > 0) {
      list = list.filter((p) => activeSubFilters.some((sub) => p.name.includes(sub) || p.name.toLowerCase().includes(sub.toLowerCase())));
    }
    if (catalogQuery.trim()) {
      list = list.filter((p) => p.name.toLowerCase().includes(catalogQuery.trim().toLowerCase()));
    }
    return list;
  }, [currentRawProducts, activeSubFilters, catalogQuery]);

  // Main Generation Pipeline
  const generate = async () => {
    if (!imageBase64) return toast.error("ابتدا یک عکس از فضای خانه آپلود کنید");
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
        toast.error("هومینو استودیو نتوانست چیدمان دقیقی پیشنهاد دهد. لطفاً دوباره تلاش کنید.");
        trackAIDesignResult("failed", { errorMessage: result.status, style, budget: budgetNum });
      } else {
        toast.success("چیدمان هوشمند با موفقیت آماده شد");
        trackAIDesignResult("finished", { placementsCount: result.placements.length, style, budget: budgetNum });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "خطا در تولید طراحی";
      setAiError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      stopStageProgression();
    }
  };

  // AI Auto-Suggested Design Curation Button
  const handleAutoSuggestDesign = () => {
    const allAvailable = Object.values(products).flat();
    if (allAvailable.length === 0) {
      toast.error("در حال بارگذاری کاتالوگ دیتابیس... دوباره بزنید");
      return;
    }
    const autoPick: Record<string, Product> = {};
    const count = Math.min(6, allAvailable.length);
    for (let i = 0; i < count; i++) {
      const p = allAvailable[i];
      autoPick[p.id] = p;
    }
    setSelected(autoPick);
    toast.success("ست پیشنهادی هوشمند هومینو انتخاب شد! عکس اتاق را بگذارید و روی دکمه شروع بزنید.");
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
    <div className="min-h-screen bg-[#0d211b] text-slate-100 relative overflow-hidden font-body" dir="rtl">
      <Navbar />

      {/* Emerald & Brass Luxury Background Gradient Wash */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-[#155449]/40 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-[#0b2923]/60 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#10b98115_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <main className="container mx-auto px-4 pt-28 pb-16 relative z-10 max-w-7xl">

        {/* ── HEADER TITLE & BADGE ─────────────────────────────────── */}
        <header className="text-center max-w-3xl mx-auto mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-xs font-black tracking-wide">هومینو استودیو — طراحی و چیدمان هوشمند خانه</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            خانه خودت را با <span className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">هومینو استودیو</span> طراحی کن
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            آپلود تصویر اتاق، انتخاب سبک و وسایل دلخواه از کاتالوگ دیتابیس هومینو جهت رندرگیری هوشمند
          </p>
        </header>

        {/* ── 3D NAVIGATION TABS (3 Core Modules) ───────────── */}
        <section className="max-w-4xl mx-auto mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">

            {/* TAB 1: Smart Staging */}
            <button
              onClick={() => setActiveTab("design")}
              className={`text-right p-4 rounded-xl flex items-center gap-3 transition-all duration-300 ${
                activeTab === "design"
                  ? "bg-emerald-600 text-white border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)] font-black scale-[1.02]"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-emerald-500/50 hover:text-white"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === "design" ? "bg-white text-emerald-950 font-black" : "bg-slate-800 text-slate-300"}`}>
                <Wand2 size={20} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">۱. طراحی و چیدمان با عکس</h3>
                <p className="text-[10px] opacity-80 line-clamp-1">انتخاب وسایل + چیدمان در اتاق شما</p>
              </div>
            </button>

            {/* TAB 2: Visual AI Scanner */}
            <button
              onClick={() => setActiveTab("inspiration")}
              className={`text-right p-4 rounded-xl flex items-center gap-3 transition-all duration-300 ${
                activeTab === "inspiration"
                  ? "bg-emerald-600 text-white border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)] font-black scale-[1.02]"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-emerald-500/50 hover:text-white"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === "inspiration" ? "bg-white text-emerald-950 font-black" : "bg-slate-800 text-slate-300"}`}>
                <Search size={20} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">۲. اسکن بصری و جایگزینی</h3>
                <p className="text-[10px] opacity-80 line-clamp-1">اسکن عکس مدل + جایگذاری روی عکس خانه</p>
              </div>
            </button>

            {/* TAB 3: AI Suggestion Assistant */}
            <button
              onClick={() => setActiveTab("suggest")}
              className={`text-right p-4 rounded-xl flex items-center gap-3 transition-all duration-300 ${
                activeTab === "suggest"
                  ? "bg-emerald-600 text-white border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)] font-black scale-[1.02]"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-emerald-500/50 hover:text-white"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === "suggest" ? "bg-white text-emerald-950 font-black" : "bg-slate-800 text-slate-300"}`}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">۳. دستیار پیشنهاد دکور</h3>
                <p className="text-[10px] opacity-80 line-clamp-1">پیشنهاد هوشمند ست دکور براساس بودجه</p>
              </div>
            </button>

          </div>
        </section>

        {/* ── TAB 3: SUGGESTION ASSISTANT ── */}
        {activeTab === "suggest" && (
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl max-w-4xl mx-auto space-y-6">
            <AISuggestionAssistant
              onBack={() => setActiveTab("design")}
              onComplete={(params) => {
                setStyle(params.style);
                const budgetMap: Record<string, string> = {
                  low: "10000000", mid: "50000000", high: "100000000", premium: "500000000",
                };
                setBudget(budgetMap[params.budget] || "");
                setActiveTab("design");
                toast.success("پیشنهاد هوشمند روی تب چیدمان اعمال گردید");
              }}
            />
          </div>
        )}

        {/* ── TAB 2: VISUAL SCANNER ── */}
        {activeTab === "inspiration" && (
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl max-w-5xl mx-auto">
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
                if (roomPhotoBase64) setImageBase64(roomPhotoBase64);
                setActiveTab("design");
                toast.success("محصولات شناسایی‌شده به محیط چیدمان منتقل شدند");
              }}
              onBack={() => setActiveTab("design")}
            />
          </div>
        )}

        {/* ── TAB 1: MAIN DESIGN FLOW (STEP 1 TO 6) ────────────────── */}
        {activeTab === "design" && (
          <div className="space-y-8 max-w-5xl mx-auto">

            {/* ── STEP 1: UPLOAD ROOM PHOTO (قسمت اول: آپلود عکس اتاق) ── */}
            <section className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-xs">۱</span>
                  بارگذاری عکس اتاق یا خانه شما
                </h2>
                {imageBase64 && (
                  <button onClick={() => setImageBase64(null)} className="text-xs text-red-400 hover:underline flex items-center gap-1">
                    <X size={13} /> تغییر عکس
                  </button>
                )}
              </div>

              {!imageBase64 ? (
                <div
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                  className="rounded-2xl p-8 text-center cursor-pointer border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-950/60 transition-all group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Upload size={28} className="animate-bounce" />
                  </div>
                  <p className="font-extrabold text-sm text-white mb-1">عکس فضای اتاق خود را بفرستید</p>
                  <p className="text-xs text-slate-400 mb-3">کلیک کنید یا عکس را بکشید و رها کنید (JPG, PNG - حداکثر ۵ مگابایت)</p>
                  <input ref={inputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 shadow-xl aspect-video bg-black">
                  <img src={imageBase64} alt="اتاق شما" className="w-full h-full object-cover" />
                </div>
              )}
            </section>

            {/* ── STEP 2: INTERIOR STYLE SELECTOR WITH PHOTO CARDS (قسمت دوم: انتخاب سبک همراه با عکس) ── */}
            <section className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-xs">۲</span>
                  انتخاب سبک دکوراسیون (با مشاهده تصویر نمونه)
                </h2>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                  سبک فعال: {STYLES.find((s) => s.id === style)?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STYLES.map((s) => {
                  const isSelected = style === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`relative text-right rounded-2xl overflow-hidden border transition-all duration-300 group ${
                        isSelected
                          ? "border-emerald-400 ring-2 ring-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-[1.02]"
                          : "border-slate-800 hover:border-emerald-500/40 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden relative bg-slate-950">
                        <img src={s.image} alt={s.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                        {isSelected && (
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow font-black">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 bg-slate-900">
                        <p className={`text-xs font-black ${isSelected ? "text-emerald-400" : "text-white"}`}>{s.label}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── STEP 3: MULTI-SELECTABLE CATEGORIES & SLIDING SUB-TYPE DRAWER (قسمت سوم: انتخاب کالا چندانتخابی) ── */}
            <section className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 flex-wrap gap-2">
                <div>
                  <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-xs">۳</span>
                    انتخاب دسته‌بندی کالاها (مولتی‌سلکتیو / چندانتخابی)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    روی هر دسته کلیک کنید تا انتخاب/غیرفعال شود (با روشن شدن رنگ). همچنین با کلیک کشویی، مدل‌های دقیق قابل مشاهده است.
                  </p>
                </div>

                {selectedList.length > 0 && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                    تعداد وسایل انتخاب‌شده: {selectedList.length} کالا
                  </span>
                )}
              </div>

              {/* Multi-Select Category Pills */}
              <div className="flex flex-wrap gap-2.5">
                {CATEGORIES.map((cat) => {
                  const isCatSelected = !!selectedCategories[cat.slug];
                  const Icon = cat.Icon;

                  return (
                    <div key={cat.slug} className="relative">
                      <button
                        onClick={() => {
                          toggleCategorySelection(cat.slug);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-300 ${
                          isCatSelected
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105"
                            : "bg-slate-950/70 text-slate-400 border-slate-800 hover:border-emerald-500/40 hover:text-white"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{cat.label}</span>
                        {isCatSelected && <CheckCircle2 size={14} className="text-white" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Sub-Type & Product Drawer */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/20 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-400">
                      زیردسته‌ها و محصولات: {currentCategoryDef?.label}
                    </span>
                    <button
                      onClick={() => setExpandedCat(expandedCat ? null : currentCategoryDef?.slug || "furniture")}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {expandedCat ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Quick catalog search input */}
                  <div className="relative min-w-[200px]">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={catalogQuery}
                      onChange={(e) => setCatalogQuery(e.target.value)}
                      placeholder={`جستجو در ${currentCategoryDef?.label}...`}
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Sub-type tag buttons (e.g. مبل ال، ۴ نفره، گرد...) */}
                {currentCategoryDef && currentCategoryDef.subTypes.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400">فیلتر دقیق سبک / ابعاد در این دسته:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentCategoryDef.subTypes.map((sub) => {
                        const isSubActive = (selectedSubTypes[currentCategoryDef.slug] || []).includes(sub);
                        return (
                          <button
                            key={sub}
                            onClick={() => toggleSubType(currentCategoryDef.slug, sub)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                              isSubActive
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold"
                                : "bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/40"
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Database Products Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {filteredCurrentProducts.length === 0 ? (
                    <p className="text-xs text-slate-500 col-span-full text-center py-6">
                      محصولی با مشخصات انتخابی در دیتابیس موجود نیست.
                    </p>
                  ) : (
                    filteredCurrentProducts.map((p) => {
                      const isProductSelected = !!selected[p.id];
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleProduct(p)}
                          className={`relative text-right rounded-2xl border overflow-hidden transition-all bg-slate-900 group ${
                            isProductSelected
                              ? "border-emerald-400 ring-2 ring-emerald-500/50 shadow-lg bg-emerald-500/10 scale-[1.02]"
                              : "border-slate-800 hover:border-emerald-500/40"
                          }`}
                        >
                          <div className="aspect-square bg-black overflow-hidden relative">
                            {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                            <div className="absolute top-1.5 left-1.5 z-10">
                              {isProductSelected ? (
                                <span className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow">
                                  <CheckCircle2 size={13} />
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-md bg-black/60 text-white/60 flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    })
                  )}
                </div>
              </div>
            </section>

            {/* ── STEP 4 & 5: BUDGET & CUSTOM NOTES (قسمت چهارم و پنجم: بودجه و باکس توضیحات) ── */}
            <section className="grid sm:grid-cols-2 gap-4">
              {/* Step 4: Budget */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl space-y-2">
                <h2 className="text-sm md:text-base font-black text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-xs">۴</span>
                  سقف بودجه مد نظر (اختیاری)
                </h2>
                <p className="text-[11px] text-slate-400">در صورت خالی ماندن، جستجوی بودجه آزاد انجام می‌شود.</p>
                <div className="relative pt-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="مثلاً: ۵۰,۰۰۰,۰۰۰"
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">تومان</span>
                </div>
              </div>

              {/* Step 5: Custom Prompt Description Area */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl space-y-2">
                <h2 className="text-sm md:text-base font-black text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-xs">۵</span>
                  توضیحات و دستورات اختصاصی
                </h2>
                <p className="text-[11px] text-slate-400">نکات تأثیرگذار جهت چیدمان بهتر هوش مصنوعی</p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="مثلاً: مبل ال ترجیحاً سمت راست پنجره باشد و گیاه کنار تلویزیون قرار گیرد..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 h-[68px] resize-none"
                />
              </div>
            </section>

            {/* ── STEP 6: DUAL ACTION BUTTONS (دکمه شروع طراحی + دکمه طراحی پیشنهادی) ── */}
            <section className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Button 1: Start Custom User Design */}
                <button
                  onClick={generate}
                  disabled={loading || !imageBase64 || selectedList.length === 0}
                  className="py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-slate-950 font-black text-sm md:text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:opacity-95 disabled:opacity-40 transition-all"
                >
                  <Wand2 size={20} />
                  شروع طراحی هوشمند با وسایل انتخابی شما
                </button>

                {/* Button 2: Auto-Suggested Design Curation */}
                <button
                  onClick={handleAutoSuggestDesign}
                  disabled={loading}
                  className="py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-black text-sm md:text-base flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Sparkles size={20} className="text-emerald-400 animate-pulse" />
                  طراحی پیشنهادی هومینو استودیو (انتخاب خودکار)
                </button>
              </div>

              {/* Progress Loading Steps */}
              {loading && (
                <div className="pt-4">
                  <AIDesignProgress steps={progressSteps} currentLabel={STAGE_CONFIG[currentStage]?.label} />
                </div>
              )}

              {/* Error Alert */}
              {aiError && !loading && (
                <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 text-xs flex items-start gap-3 text-red-300">
                  <Info size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <div className="flex-1 space-y-2">
                    <p className="font-bold">خطا در چیدمان</p>
                    <p className="text-slate-400">{aiError}</p>
                    <button onClick={generate} className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:underline">
                      <RefreshCw size={12} /> تلاش مجدد
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ── RENDER RESULT CANVAS OUTPUT ── */}
            {geminiResult && (
              <section ref={resultRef} className={`p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-4 transition-all ${fullscreen ? "fixed inset-4 z-50 bg-slate-950 overflow-y-auto" : ""}`}>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-black text-lg text-emerald-400">نتیجه طراحی و چیدمان هومینو استودیو</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFullscreen(!fullscreen)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white">
                      {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button onClick={() => {
                      const img = resultRef.current?.querySelector("img");
                      if (img) {
                        const link = document.createElement("a");
                        link.download = "homeino-design.png";
                        link.href = img.src;
                        link.click();
                        toast.success("تصویر خروجی ذخیره گردید");
                      }
                    }} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white">
                      <Download size={14} />
                    </button>
                    <button onClick={async () => {
                      try {
                        await navigator.share({ title: "طراحی هومینو استودیو", text: "طراحی هوشمند اتاق من با هومینو", url: window.location.href });
                      } catch {
                        navigator.clipboard?.writeText(window.location.href);
                        toast.success("لینک کپی گردید");
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

                <div className="space-y-3 pt-2">
                  <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
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
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
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
                          <div key={pl.product_id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex gap-3 items-center">
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
              </section>
            )}

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
