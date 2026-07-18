import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Wand2, Search, Sparkles, RefreshCw,
  ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers,
  CheckCircle2, Banknote, Info, Maximize2, Minimize2, Download, Share2,
  Sofa, Blinds, Grid3x3, Lamp, BedDouble, Flower2, Image as ImageIcon,
  Gem, Compass, ShieldCheck, ChevronDown, ChevronUp, Tv, BookOpen, Heart, CreditCard, Store,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { runAIDesignPipeline } from "@/lib/aiPipeline";
import type { PipelineResult } from "@/lib/aiPipeline";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/hooks/useWishlist";
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
  { id: "modern",       label: "مدرن",        image: styleModern,     desc: "خطوط صاف و ساده" },
  { id: "classic",      label: "کلاسیک",      image: styleClassic,    desc: "نقش‌های باشکوه" },
  { id: "minimalist",   label: "مینیمال",     image: styleMinimalist, desc: "خلوتی و آرامش" },
  { id: "luxury",       label: "لوکس",        image: styleLuxury,     desc: "جزئیات طلایی و مرمر" },
  { id: "scandinavian", label: "اسکاندیناوی", image: styleScandi,     desc: "چوب روشن و نور" },
  { id: "industrial",   label: "صنعتی",       image: styleIndustrial, desc: "فلز سیاه و آجر" },
  { id: "bohemian",     label: "بوهمی",       image: styleBoho,       desc: "بافت‌های سنتی" },
  { id: "japanese",     label: "ژاپنی",       image: styleJapandi,    desc: "تعادل و سادگی" },
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
    subTypes: ["مبل ال", "مبل تدی / پارچه‌ای", "مبل چسترفیلد", "مبل کلاسیک", "صندلی راحتی تک‌نفره", "پاف و اتومان"],
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
    subTypes: ["پرده پانچی مدرن", "پرده شید و زبرا", "پرده مخمل کلاسیک", "تور و حریر"],
  },
  {
    slug: "carpet",
    label: "فرش و کف‌پوش",
    Icon: Grid3x3,
    subTypes: ["فرش ماشینی مدرن", "فرش دستبافت ایرانی", "فرش وینتیج", "گلیم و جاجیم"],
  },
  {
    slug: "lighting",
    label: "روشنایی و آباژور",
    Icon: Lamp,
    subTypes: ["آباژور ایستاده", "آباژور رومیزی", "لوستر سقفی", "چراغ دیوارکوب"],
  },
  {
    slug: "tv-console",
    label: "میز TV و کنسول",
    Icon: Tv,
    subTypes: ["میز تلویزیون مدرن", "میز کنسول چوبی", "میز جلومبلی"],
  },
  {
    slug: "bookcase-shoe",
    label: "کتابخانه و جاکفشی",
    Icon: BookOpen,
    subTypes: ["جاکفشی مدرن", "کتابخانه طبقاتی", "شلف دیواری"],
  },
  {
    slug: "bedding",
    label: "تخت و سرویس خواب",
    Icon: BedDouble,
    subTypes: ["تخت لمسه‌دوزی", "پاتختی مدرن", "سرویس خواب چوبی"],
  },
  {
    slug: "plants",
    label: "گل و گیاه",
    Icon: Flower2,
    subTypes: ["گیاهان آپارتمانی بزرگ (سانسوریا/فیکوس)", "گلدان ایستاده", "گیاهان تزئینی"],
  },
  {
    slug: "art",
    label: "تابلو نقاشی و آینه",
    Icon: ImageIcon,
    subTypes: ["تابلو بوم انتزاعی", "ست چندتایی", "آینه دکوراتیو"],
  },
  {
    slug: "accessories",
    label: "اکسسوری و دکوراتیو",
    Icon: Gem,
    subTypes: ["شمع و شمعدان", "مجسمه دکوراتیو", "گلدان کریستال"],
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
  const navigate = useNavigate();
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
    furniture: true,
  });
  const [expandedCat, setExpandedCat]   = useState<string | null>("furniture");
  const [selectedSubTypes, setSelectedSubTypes] = useState<Record<string, string[]>>({});

  // Seller store profiles map: profile_id -> brand_name
  const [sellerMap, setSellerMap]         = useState<Record<string, string>>({});

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
  const { add: addToWishlist } = useWishlist();

  const { consumeDesignCredit } = useTokens();

  // Load seller brand names from public_profiles
  useEffect(() => {
    (async () => {
      const { data: sellers } = await supabase.from("public_profiles").select("id, brand_name");
      const sMap: Record<string, string> = {};
      (sellers || []).forEach((s) => {
        if (s.brand_name) sMap[s.id] = s.brand_name;
      });
      setSellerMap(sMap);
    })();
  }, []);

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

  // Filter products for active expanded category
  const currentCategoryDef = useMemo(() => CATEGORIES.find((c) => c.slug === expandedCat), [expandedCat]);
  const currentRawProducts = useMemo(() => (expandedCat ? products[expandedCat] || [] : []), [products, expandedCat]);
  const activeSubFilters   = useMemo(() => (expandedCat ? selectedSubTypes[expandedCat] || [] : []), [selectedSubTypes, expandedCat]);

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

  // AI Pipeline Execution
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

  // Auto-Suggested Curation
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
    toast.success("ست پیشنهادی هوشمند انتخاب شد! عکس اتاق را آپلود کنید و روی دکمه شروع بزنید.");
  };

  const addToCart = (p: Product) => {
    const res = addItem({
      product_id: p.id, profile_id: p.profile_id || "",
      name: p.name, price: p.price || 0, image_url: p.image_url, stock: p.stock || 10,
    });
    if (res.ok) toast.success("به سبد خرید اضافه شد");
  };

  // Save full design to Wishlist
  const handleSaveToWishlist = async () => {
    if (selectedList.length === 0) {
      toast.error("هیچ محصولی انتخاب نشده است");
      return;
    }
    let savedCount = 0;
    for (const p of selectedList) {
      const success = await addToWishlist({
        item_type: "product",
        item_id: p.id,
        title: p.name,
        price: p.price,
        image_url: p.image_url,
        metadata: { profile_id: p.profile_id, brand_name: sellerMap[p.profile_id || ""] || "هومینو" },
      });
      if (success) savedCount++;
    }
    if (savedCount > 0) {
      toast.success(`${savedCount} کالا با موفقیت به لیست علاقه‌مندی‌های شما اضافه شد`);
    }
  };

  // Register Order & Proceed to Checkout Gateway Flow
  const handleCheckoutAndPay = () => {
    if (selectedList.length === 0) {
      toast.error("هیچ محصولی انتخاب نشده است");
      return;
    }
    // Add items to cart
    for (const p of selectedList) {
      addItem({
        product_id: p.id,
        profile_id: p.profile_id || "",
        name: p.name,
        price: p.price || 0,
        image_url: p.image_url,
        stock: p.stock || 10,
      });
    }
    setOpenCart(false);
    toast.success("محصولات به سبد خرید منتقل گردیدند. در حال انتقال به درگاه پرداخت...");
    navigate("/checkout");
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

      {/* Emerald Background Wash */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-[#155449]/40 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-[#0b2923]/60 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#10b98115_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <main className="container mx-auto px-4 pt-28 pb-16 relative z-10 max-w-7xl">

        {/* ── HEADER BADGE & TITLE ───────────────────────────────── */}
        <header className="text-center max-w-3xl mx-auto mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1 border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Sparkles size={14} className="animate-pulse" />
            <span className="text-xs font-black tracking-wide">هومینو استودیو — استودیوی هوشمند دکوراسیون</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
            خانه خودت را با <span className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">هومینو استودیو</span> طراحی کن
          </h1>
        </header>

        {/* ── TABS NAVIGATION (3 Core Modules) ───────────── */}
        <section className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]">

            {/* TAB 1: Smart Staging */}
            <button
              onClick={() => setActiveTab("design")}
              className={`text-right p-3 rounded-xl flex items-center gap-2.5 transition-all duration-300 ${
                activeTab === "design"
                  ? "bg-emerald-600 text-white border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] font-black scale-[1.01]"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-emerald-500/50 hover:text-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === "design" ? "bg-white text-emerald-950 font-black" : "bg-slate-800 text-slate-300"}`}>
                <Wand2 size={16} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">۱. طراحی و چیدمان با عکس</h3>
                <p className="text-[9px] opacity-80 line-clamp-1">انتخاب وسایل + چیدمان در اتاق شما</p>
              </div>
            </button>

            {/* TAB 2: Visual AI Scanner */}
            <button
              onClick={() => setActiveTab("inspiration")}
              className={`text-right p-3 rounded-xl flex items-center gap-2.5 transition-all duration-300 ${
                activeTab === "inspiration"
                  ? "bg-emerald-600 text-white border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] font-black scale-[1.01]"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-emerald-500/50 hover:text-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === "inspiration" ? "bg-white text-emerald-950 font-black" : "bg-slate-800 text-slate-300"}`}>
                <Search size={16} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">۲. اسکن بصری و جایگزینی</h3>
                <p className="text-[9px] opacity-80 line-clamp-1">اسکن عکس مدل + جایگذاری روی عکس خانه</p>
              </div>
            </button>

            {/* TAB 3: AI Suggestion Assistant */}
            <button
              onClick={() => setActiveTab("suggest")}
              className={`text-right p-3 rounded-xl flex items-center gap-2.5 transition-all duration-300 ${
                activeTab === "suggest"
                  ? "bg-emerald-600 text-white border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] font-black scale-[1.01]"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-emerald-500/50 hover:text-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === "suggest" ? "bg-white text-emerald-950 font-black" : "bg-slate-800 text-slate-300"}`}>
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">۳. دستیار پیشنهاد دکور</h3>
                <p className="text-[9px] opacity-80 line-clamp-1">پیشنهاد هوشمند ست دکور براساس بودجه</p>
              </div>
            </button>

          </div>
        </section>

        {/* ── TAB 3: SUGGESTION ASSISTANT ── */}
        {activeTab === "suggest" && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl max-w-4xl mx-auto space-y-6">
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
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl max-w-5xl mx-auto">
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

        {/* ── TAB 1: MAIN SPLIT WORKSTATION (RIGHT PANEL CONTROLS VS LEFT STAGE & PRODUCTS BREAKDOWN) ── */}
        {activeTab === "design" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ── RIGHT COLUMN: COMPACT CONTROLS DOCK (سمت راست - کنترل‌های فشرده) ── */}
            <div className="lg:col-span-5 space-y-4">

              {/* 1. Room Photo Dropzone */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl backdrop-blur-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <h2 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-[10px]">۱</span>
                    تصویر اتاق شما
                  </h2>
                  {imageBase64 && (
                    <button onClick={() => setImageBase64(null)} className="text-[10px] text-red-400 hover:underline flex items-center gap-1">
                      <X size={11} /> حذف عکس
                    </button>
                  )}
                </div>

                {!imageBase64 ? (
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                    className="rounded-xl p-5 text-center cursor-pointer border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-950/60 transition-all group"
                  >
                    <Upload size={22} className="mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-xs text-white mb-1">بارگذاری عکس فضای شما</p>
                    <p className="text-[10px] text-slate-400">کلیک کنید یا عکس را بکشید (JPG, PNG)</p>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 aspect-video bg-black">
                    <img src={imageBase64} alt="اتاق شما" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* 2. Style Selector with Photo Thumbnails (Compact 2x4 Grid) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl backdrop-blur-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <h2 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-[10px]">۲</span>
                    سبک دکوراسیون
                  </h2>
                  <span className="text-[10px] text-emerald-400 font-bold">{STYLES.find((s) => s.id === style)?.label}</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {STYLES.map((s) => {
                    const isSelected = style === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`relative rounded-xl overflow-hidden border transition-all text-center group ${
                          isSelected
                            ? "border-emerald-400 ring-2 ring-emerald-500/60 shadow-md scale-105"
                            : "border-slate-800 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="aspect-square w-full relative bg-slate-950">
                          <img src={s.image} alt={s.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40" />
                          <span className="absolute bottom-1 right-0 left-0 text-[9px] font-black text-white truncate px-1">
                            {s.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Multi-Selectable Categories & Collapsible Sub-Type Catalog */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl backdrop-blur-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <h2 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-[10px]">۳</span>
                    انتخاب کالاها (Multi-Select)
                  </h2>
                  <span className="text-[10px] font-bold text-emerald-400">{selectedList.length} کالا</span>
                </div>

                {/* Category buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const isCatSelected = !!selectedCategories[cat.slug];
                    const Icon = cat.Icon;
                    return (
                      <button
                        key={cat.slug}
                        onClick={() => toggleCategorySelection(cat.slug)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          isCatSelected
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                            : "bg-slate-950/70 text-slate-400 border-slate-800 hover:border-emerald-500/40 hover:text-white"
                        }`}
                      >
                        <Icon size={12} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded Sub-Types Drawer */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-emerald-400">انواع {currentCategoryDef?.label}:</span>
                    <div className="relative min-w-[120px]">
                      <input
                        type="text"
                        value={catalogQuery}
                        onChange={(e) => setCatalogQuery(e.target.value)}
                        placeholder="جستجو..."
                        className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Sub-type tags */}
                  {currentCategoryDef && currentCategoryDef.subTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {currentCategoryDef.subTypes.map((sub) => {
                        const isSubActive = (selectedSubTypes[currentCategoryDef.slug] || []).includes(sub);
                        return (
                          <button
                            key={sub}
                            onClick={() => toggleSubType(currentCategoryDef.slug, sub)}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all ${
                              isSubActive
                                ? "bg-emerald-500 text-slate-950 border-emerald-400"
                                : "bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/40"
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Database Product Items Grid */}
                  <div className="grid grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto pr-1 pt-1">
                    {filteredCurrentProducts.length === 0 ? (
                      <p className="text-[10px] text-slate-500 col-span-full text-center py-4">کالایی موجود نیست.</p>
                    ) : (
                      filteredCurrentProducts.map((p) => {
                        const isProductSelected = !!selected[p.id];
                        return (
                          <button
                            key={p.id}
                            onClick={() => toggleProduct(p)}
                            className={`relative text-right rounded-xl border overflow-hidden transition-all bg-slate-900 ${
                              isProductSelected
                                ? "border-emerald-400 ring-1 ring-emerald-500/50 bg-emerald-500/10"
                                : "border-slate-800 hover:border-emerald-500/30"
                            }`}
                          >
                            <div className="aspect-square bg-black overflow-hidden relative">
                              {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                              {isProductSelected && (
                                <span className="absolute top-1 left-1 w-4 h-4 rounded bg-emerald-500 text-slate-950 flex items-center justify-center text-[8px] font-black">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="p-1">
                              <p className="text-[9px] font-bold line-clamp-1 text-slate-200">{p.name}</p>
                              <p className="text-[9px] text-emerald-400 font-black">{fmt(p.price)}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* 4 & 5. Budget Range & Custom Prompt */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-bold text-slate-300">سقف بودجه (تومان)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="آزاد"
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-bold text-slate-300">توضیحات طراحی</span>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="دستور به AI..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 6. Dual Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={generate}
                  disabled={loading || !imageBase64 || selectedList.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-slate-950 font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:opacity-95 disabled:opacity-40 transition-all"
                >
                  <Wand2 size={16} />
                  شروع طراحی هوشمند با وسایل انتخابی
                </button>

                <button
                  onClick={handleAutoSuggestDesign}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all"
                >
                  <Sparkles size={14} className="text-emerald-400" />
                  طراحی پیشنهادی هومینو استودیو (انتخاب خودکار)
                </button>
              </div>

              {/* Progress Loading Steps */}
              {loading && (
                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30">
                  <AIDesignProgress steps={progressSteps} currentLabel={STAGE_CONFIG[currentStage]?.label} />
                </div>
              )}

              {/* Error Notification */}
              {aiError && !loading && (
                <div className="p-3 rounded-xl border border-red-500/40 bg-red-950/20 text-[11px] text-red-300">
                  <p className="font-bold">خطا: {aiError}</p>
                  <button onClick={generate} className="text-emerald-400 hover:underline font-bold mt-1 inline-flex items-center gap-1">
                    <RefreshCw size={11} /> تلاش مجدد
                  </button>
                </div>
              )}

            </div>

            {/* ── LEFT COLUMN: RENDER VIEWPORT STAGE & PRODUCTS BREAKDOWN (سمت چپ - نمایش رندر و محصولات) ── */}
            <div className="lg:col-span-7 space-y-4">

              {/* Left Stage Frame Viewport */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                    <Wand2 size={16} />
                    خروجی طراحی و چیدمان هومینو استودیو
                  </h3>

                  {geminiResult && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFullscreen(!fullscreen)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white">
                        {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
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
                        <Download size={13} />
                      </button>
                      <button onClick={async () => {
                        try {
                          await navigator.share({ title: "طراحی هومینو", text: "طراحی هوشمند اتاق من", url: window.location.href });
                        } catch {
                          navigator.clipboard?.writeText(window.location.href);
                          toast.success("لینک کپی شد");
                        }
                      }} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white">
                        <Share2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Viewport Render Canvas */}
                <div ref={resultRef} className={`rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950 relative aspect-video flex items-center justify-center ${fullscreen ? "fixed inset-4 z-50 bg-slate-950 p-6" : ""}`}>
                  {geminiResult?.status === "ok" && imageBase64 ? (
                    showBefore ? (
                      <img src={imageBase64} alt="فضای اصلی" className="w-full h-full object-cover" />
                    ) : (
                      <ProductOverlay
                        roomImage={imageBase64}
                        placements={geminiResult.placements}
                        onProductClick={addToCart}
                      />
                    )
                  ) : imageBase64 ? (
                    <img src={imageBase64} alt="اتاق شما" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-8 space-y-2 text-slate-500">
                      <Wand2 size={36} className="mx-auto text-slate-600 animate-pulse" />
                      <p className="text-xs font-bold">پیش‌نمایش چیدمان در این کادر قرار می‌گیرد</p>
                      <p className="text-[10px]">عکس اتاق را بفرستید و وسایل را از پنل سمت راست انتخاب کنید</p>
                    </div>
                  )}
                </div>

                {/* Before / After toggle button */}
                {geminiResult?.status === "ok" && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowBefore(false)}
                      className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                        !showBefore ? "bg-emerald-500 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      نتیجه رندر چیدمان
                    </button>
                    <button
                      onClick={() => setShowBefore(true)}
                      className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                        showBefore ? "bg-emerald-500 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      تصویر اولیه اتاق
                    </button>
                  </div>
                )}
              </div>

              {/* ── PRODUCTS USED BREAKDOWN CARD (پایین تصویر: کالاها + اسم فروشگاه + قیمت + جمع کل) ── */}
              {selectedList.length > 0 && (
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                      <ShoppingBag size={16} className="text-emerald-400" />
                      کالاهای استفاده‌شده در این طرح ({selectedList.length} کالا)
                    </h3>
                  </div>

                  {/* List of used products with seller store brand names */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {selectedList.map((p) => {
                      const storeBrand = sellerMap[p.profile_id || ""] || "فروشگاه هومینو";
                      const qty = quantities[p.id] || 1;
                      return (
                        <div key={p.id} className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">کالا</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white line-clamp-1">{p.name}</p>
                            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-semibold">
                              <Store size={11} /> {storeBrand}
                            </p>
                            <p className="text-xs font-black text-gold mt-1">
                              {fmt((p.price || 0) * qty)} {qty > 1 && <span className="text-[9px] text-slate-400 font-normal">({qty} عدد)</span>}
                            </p>
                          </div>

                          <button onClick={() => toggleProduct(p)} className="text-slate-500 hover:text-red-400 p-1">
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Amount Sum Display */}
                  <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">جمع کل فاکتور دیتابیس:</span>
                    <span className="text-base font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      {fmt(total)}
                    </span>
                  </div>

                  {/* ── POST-DESIGN ACTION BUTTONS (ذخیره در علاقه‌مندی + خرید و ادامه تا درگاه) ── */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    {/* Action 1: Save to Wishlist */}
                    <button
                      onClick={handleSaveToWishlist}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all"
                    >
                      <Heart size={16} className="text-emerald-400" />
                      ذخیره به عنوان علاقه‌مندی
                    </button>

                    {/* Action 2: Add to Cart & Proceed to Payment Gateway */}
                    <button
                      onClick={handleCheckoutAndPay}
                      className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
                    >
                      <CreditCard size={16} />
                      ثبت سفارش و ادامه تا درگاه پرداخت
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default AIDesign;
