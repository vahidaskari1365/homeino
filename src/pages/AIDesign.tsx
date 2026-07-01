import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Wand2, Loader2, Download, ArrowLeft, Sparkles, RefreshCw, Check,
  ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers, Target, Edit3,
  Save, RotateCcw, Search, Package2, Store, BadgePercent, TrendingDown,
  TrendingUp, Truck, Star, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import MaskCanvas from "@/components/MaskCanvas";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import AIPromptBox from "@/components/AIPromptBox";
import BudgetInput from "@/components/BudgetInput";
import EconomyPremiumToggle from "@/components/EconomyPremiumToggle";
import FinancialReport from "@/components/FinancialReport";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { redesignRoom, replaceProductInImage } from "@/services/huggingface";
import { saveProject, getProject, generateId } from "@/services/projects";

// ---- Types ----
type DesignStage = "UPLOADING" | "ANALYZING_SPACE" | "SELECTING_PRODUCTS" | "LAYING_OUT" | "RENDERING";

const STAGE_CONFIG: Record<DesignStage, { label: string; progress: number }> = {
  UPLOADING: { label: "آپلود تصویر", progress: 0 },
  ANALYZING_SPACE: { label: "تحلیل ابعاد، نور و سبک فضا...", progress: 20 },
  SELECTING_PRODUCTS: { label: "بررسی و انتخاب محصولات...", progress: 40 },
  LAYING_OUT: { label: "چیدمان هوشمند محصولات در فضا...", progress: 60 },
  RENDERING: { label: "رندرگیری نهایی و بهینه‌سازی...", progress: 85 },
};

const STAGES: DesignStage[] = ["UPLOADING", "ANALYZING_SPACE", "SELECTING_PRODUCTS", "LAYING_OUT", "RENDERING"];

const STYLES = [
  { id: "modern", label: "مدرن", icon: "🏠", desc: "خطوط صاف و ساده" },
  { id: "minimalist", label: "مینیمال", icon: "◻️", desc: "کمترین عناصر، بیشترین آرامش" },
  { id: "scandinavian", label: "اسکاندیناوی", icon: "❄️", desc: "گرما و سادگی شمال اروپا" },
  { id: "japanese", label: "جاپاندی", icon: "🎋", desc: "ترکیب مینیمال ژاپنی و اسکاندیناوی" },
  { id: "industrial", label: "صنعتی", icon: "🏭", desc: "آجر، فلز و فضای باز" },
  { id: "luxury", label: "لوکس", icon: "💎", desc: "تجمل و شکوه" },
  { id: "bohemian", label: "بوهمی", icon: "🌿", desc: "رنگ، طرح و آزادی" },
  { id: "classic", label: "کلاسیک", icon: "🏛️", desc: "اصالت و وقار" },
];

const CATEGORIES: { slug: string; label: string; icon: string }[] = [
  { slug: "furniture", label: "مبلمان", icon: "🛋️" },
  { slug: "curtain", label: "پرده", icon: "🪟" },
  { slug: "carpet", label: "فرش", icon: "🟫" },
  { slug: "lighting", label: "لوستر", icon: "💡" },
  { slug: "bedding", label: "تخت و خواب", icon: "🛏️" },
  { slug: "plants", label: "گل و گیاه", icon: "🪴" },
  { slug: "art", label: "تابلو", icon: "🖼️" },
  { slug: "wood-decor", label: "دکور چوبی", icon: "🪵" },
  { slug: "accessories", label: "اکسسوری", icon: "🎀" },
];

type Product = {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  category_id: string | null;
  profile_id?: string;
  stock?: number;
  store_name?: string;
  delivery_time?: string;
  rating?: number;
};

type RoomAnalytics = {
  tip?: string;
  colorPalette?: string[];
  styleMatch?: number;
  spatialAdvice?: string;
};

interface StoreOffer {
  storeId: string;
  storeName: string;
  price: number;
  rating: number;
  delivery: string;
  isBestPrice: boolean;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

const DELIVERY_ESTIMATES = [
  "۱-۳ روز", "۳-۵ روز", "۵-۷ روز", "۷-۱۴ روز",
];

const AIDesign = () => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [style, setStyle] = useState("modern");
  const [budget, setBudget] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [currentStage, setCurrentStage] = useState<DesignStage>("UPLOADING");
  const [roomTip, setRoomTip] = useState<string | null>(null);
  const [roomAnalytics, setRoomAnalytics] = useState<RoomAnalytics | null>(null);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].slug);
  const [catMap, setCatMap] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const [selected, setSelected] = useState<Record<string, Product>>({});
  const [maskDialogOpen, setMaskDialogOpen] = useState(false);
  const [pendingMask, setPendingMask] = useState<string | null>(null);
  const [analyticsTab, setAnalyticsTab] = useState<"tip" | "colors" | "advice">("tip");
  const [designConfirmed, setDesignConfirmed] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [storeOffers, setStoreOffers] = useState<Record<string, StoreOffer[]>>({});
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  // Smart Replace state
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replacingProduct, setReplacingProduct] = useState<{ old: Product; categoryId: string; categorySlug: string } | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [replaceCategoryProds, setReplaceCategoryProds] = useState<Product[]>([]);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItem, setOpen: setOpenCart } = useCart();
  const [searchParams] = useSearchParams();

  // Load project from query param
  useEffect(() => {
    const projectId = searchParams.get("project");
    if (!projectId) return;
    const project = getProject(projectId);
    if (!project) { toast.error("پروژه مورد نظر یافت نشد"); return; }
    setImageBase64(project.originalImage);
    setResultImage(project.generatedImage);
    setStyle(project.style);
    setPrompt(project.prompt);
    setRoomTip(project.roomTip);
    setCurrentProjectId(project.id);
    setProjectTitle(project.title);
    if (project.selectedProducts) {
      setSelected(project.selectedProducts as Record<string, Product>);
    }
    toast.success("پروژه بارگذاری شد");
  }, [searchParams]);

  // Load categories + products + stores
  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from("producer_categories").select("id, slug");
      const map: Record<string, string> = {};
      (cats || []).forEach((c) => { map[c.slug] = c.id; });
      setCatMap(map);

      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price, image_url, category_id, profile_id, stock")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .limit(500);

      const byCat: Record<string, Product[]> = {};
      const allProfileIds = new Set<string>();
      (prods || []).forEach((p) => {
        const slug = Object.keys(map).find((s) => map[s] === p.category_id);
        if (!slug) return;
        (byCat[slug] = byCat[slug] || []).push(p as Product);
        allProfileIds.add(p.profile_id);
      });
      setProducts(byCat);

      // Load store names
      if (allProfileIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, brand_name")
          .in("id", [...allProfileIds]);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach((p) => { nameMap[p.id] = p.brand_name || "فروشگاه"; });
        setStoreNames(nameMap);
      }
    })();
  }, []);

  useEffect(() => {
    return () => { if (stageTimerRef.current) clearInterval(stageTimerRef.current); };
  }, []);

  const startStageProgression = useCallback(() => {
    const stageOrder: DesignStage[] = ["ANALYZING_SPACE", "SELECTING_PRODUCTS", "LAYING_OUT", "RENDERING"];
    let idx = 0;
    setCurrentStage("ANALYZING_SPACE");
    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    stageTimerRef.current = setInterval(() => {
      idx = Math.min(idx + 1, stageOrder.length - 1);
      setCurrentStage(stageOrder[idx]);
      if (idx >= stageOrder.length - 1 && stageTimerRef.current) {
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
      setResultImage(null);
      setRoomAnalytics(null);
      setDesignConfirmed(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleProduct = (p: Product) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = p;
      return next;
    });
  };

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const total = selectedList.reduce((s, p) => s + (Number(p.price) || 0), 0);

  const buyTheLook = () => {
    if (generatedProducts.length === 0) { toast.error("هیچ محصولی در طراحی استفاده نشده"); return; }
    const productsToBuy = generatedProducts;
    const profileIds = new Set(productsToBuy.map(p => p.profile_id));
    if (profileIds.size > 1) {
      const firstSellerId = productsToBuy[0].profile_id;
      const fromFirstSeller = productsToBuy.filter(p => p.profile_id === firstSellerId);
      const fromOtherSellers = productsToBuy.filter(p => p.profile_id !== firstSellerId);
      let addedCount = 0;
      for (const p of fromFirstSeller) {
        const res = addItem({ product_id: p.id, profile_id: p.profile_id || "", name: p.name, price: p.price || 0, image_url: p.image_url, stock: p.stock || 10 });
        if (res.ok) addedCount++;
      }
      if (addedCount > 0) {
        toast.success(`${addedCount} محصول به سبد خرید اضافه شد`);
        if (fromOtherSellers.length > 0) toast.info(`${fromOtherSellers.length} محصول از فروشندگان دیگر جداگانه قابل خرید است`);
        setOpenCart(true);
      }
      return;
    }
    let addedCount = 0;
    for (const p of productsToBuy) {
      const res = addItem({ product_id: p.id, profile_id: p.profile_id || "", name: p.name, price: p.price || 0, image_url: p.image_url, stock: p.stock || 10 });
      if (res.ok) addedCount++;
    }
    if (addedCount > 0) { toast.success(`${addedCount} محصول به سبد خرید اضافه شد`); setOpenCart(true); }
  };

  const generate = async (mode: "standard" | "polish" | "mask" = "standard") => {
    const currentImage = mode === "polish" ? resultImage : imageBase64;
    if (!currentImage) return toast.error("ابتدا یک عکس از فضای خانه آپلود کنید");
    if (mode === "standard" || mode === "mask") setLoading(true);
    else setPolishing(true);
    setResultImage(null); setRoomTip(null); setRoomAnalytics(null); setDesignConfirmed(false);
    startStageProgression();
    try {
      const payloadProducts = selectedList.map((p) => {
        const slug = Object.keys(catMap).find((s) => catMap[s] === p.category_id);
        const cat = CATEGORIES.find((c) => c.slug === slug)?.label;
        return { id: p.id, name: p.name, category: cat, imageUrl: p.image_url || undefined, price: p.price ?? undefined, profile_id: p.profile_id };
      });
      const data = await redesignRoom(currentImage, style, prompt.trim(), payloadProducts, mode === "mask" ? pendingMask : undefined, mode === "polish");
      if (data.error) throw new Error(data.error);
      const img = data.image;
      if (!img) throw new Error("تصویری دریافت نشد");
      setCurrentStage("RENDERING");
      await new Promise(r => setTimeout(r, 800));
      setResultImage(img);
      if (data.tip) setRoomTip(data.tip);
      if (data.analytics) setRoomAnalytics(data.analytics);
      setGeneratedProducts([...selectedList]);

      // Build store offers for price comparison
      if (selectedList.length > 0) {
        buildStoreOffers(selectedList);
      }

      if (data.productUsage) {
        toast.success(`${data.productUsage.productCount} محصول از ${data.productUsage.storeCount} فروشگاه در طراحی استفاده شد`, {
          description: `هزینه کل: ${new Intl.NumberFormat("fa-IR").format(data.productUsage.totalCost)} تومان`,
        });
      }
      toast.success("طراحی جدید با محصولات بازار آماده شد");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "خطا در تولید طراحی");
    } finally {
      setLoading(false); setPolishing(false); setPendingMask(null); stopStageProgression();
    }
  };

  const buildStoreOffers = async (products: Product[]) => {
    const offers: Record<string, StoreOffer[]> = {};
    for (const p of products) {
      if (!p.category_id) continue;
      const { data: sameCategory } = await supabase
        .from("products")
        .select("id, name, price, profile_id, rating")
        .eq("is_active", true)
        .eq("category_id", p.category_id)
        .not("price", "is", null)
        .neq("id", p.id)
        .limit(5);
      const productOffers: StoreOffer[] = [];
      if (sameCategory && sameCategory.length > 0) {
        for (const s of sameCategory) {
          const storeName = storeNames[s.profile_id] || "فروشگاه";
          productOffers.push({
            storeId: s.profile_id,
            storeName,
            price: Number(s.price) || 0,
            rating: s.rating || 3,
            delivery: DELIVERY_ESTIMATES[Math.floor(Math.random() * DELIVERY_ESTIMATES.length)],
            isBestPrice: false,
          });
        }
      }
      if (productOffers.length > 0) {
        const minPrice = Math.min(...productOffers.map(o => o.price));
        productOffers.forEach(o => { o.isBestPrice = o.price === minPrice; });
        offers[p.id] = productOffers;
      }
    }
    setStoreOffers(offers);
  };

  const handleMaskGenerated = (maskBase64: string) => {
    setPendingMask(maskBase64); setMaskDialogOpen(false); generate("mask");
  };

  const handleConfirm = () => {
    setDesignConfirmed(true);
    toast.success("طراحی تأیید شد! می‌توانید وسایل را به سبد خرید اضافه کنید.");
  };

  const handlePolish = () => { generate("polish"); };

  const handleSaveProject = () => {
    if (!imageBase64) { toast.error("ابتدا یک عکس آپلود کنید"); return; }
    if (!projectTitle.trim()) { toast.error("لطفاً یک نام برای پروژه وارد کنید"); return; }
    const id = currentProjectId || generateId();
    saveProject({
      id, title: projectTitle.trim(), originalImage: imageBase64, generatedImage: resultImage || "",
      style, prompt, roomTip, selectedProducts: selected, budget: 0, notes: "",
      createdAt: currentProjectId ? getProject(id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setCurrentProjectId(id); setSaveDialogOpen(false);
    toast.success("پروژه با موفقیت ذخیره شد");
  };

  const download = () => {
    if (!resultImage) return;
    const a = document.createElement("a"); a.href = resultImage; a.download = `homeino-redesign-${Date.now()}.png`; a.click();
  };

  // ---- Smart Replace ----
  const handleOpenReplace = (oldProduct: Product) => {
    const catEntry = Object.entries(catMap).find(([, id]) => id === oldProduct.category_id);
    const catSlug = catEntry?.[0] || "";
    setReplacingProduct({ old: oldProduct, categoryId: oldProduct.category_id || "", categorySlug: catSlug });
    const categoryProds = catSlug ? (products[catSlug] || []) : [];
    setReplaceCategoryProds(categoryProds.filter(p => p.id !== oldProduct.id));
    setReplaceDialogOpen(true);
  };

  const handleReplaceConfirm = async (newProduct: Product) => {
    if (!replacingProduct || !resultImage) return;
    setReplacing(true); setReplaceDialogOpen(false);
    try {
      const oldName = replacingProduct.old.name;
      const newName = newProduct.name;
      const newDesc = `قیمت: ${newProduct.price ? fmt(newProduct.price) : "نامشخص"}`;
      const result = await replaceProductInImage(resultImage, oldName, newName, newDesc, style);
      if (result.error) throw new Error(result.error);
      if (!result.image) throw new Error("تصویری دریافت نشد");
      setResultImage(result.image);
      setGeneratedProducts(prev => prev.map(p => p.id === replacingProduct.old.id ? newProduct : p));
      setSelected(prev => {
        if (!prev[replacingProduct.old.id]) return prev;
        const next = { ...prev }; delete next[replacingProduct.old.id]; next[newProduct.id] = newProduct;
        return next;
      });
      toast.success(`"${oldName}" با "${newName}" جایگزین شد`, { description: "بقیه اجزای طراحی بدون تغییر ماندند." });
    } catch (e) {
      console.error(e); toast.error(e instanceof Error ? e.message : "خطا در جایگزینی محصول");
    } finally { setReplacing(false); setReplacingProduct(null); }
  };

  // ---- Budget Optimization ----
  const handleApplyCheaperAlternative = (oldProduct: Product) => {
    if (!oldProduct.category_id) return;
    const catSlug = Object.keys(catMap).find((s) => catMap[s] === oldProduct.category_id);
    if (!catSlug) return;
    const catProds = products[catSlug] || [];
    const cheaper = catProds
      .filter(p => p.id !== oldProduct.id && (Number(p.price) || 0) < (Number(oldProduct.price) || 0))
      .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (cheaper.length === 0) { toast.error("جایگزین ارزان‌تری یافت نشد"); return; }
    const replacement = cheaper[0];
    setGeneratedProducts(prev => prev.map(p => p.id === oldProduct.id ? replacement : p));
    setSelected(prev => {
      if (!prev[oldProduct.id]) return prev;
      const next = { ...prev }; delete next[oldProduct.id]; next[replacement.id] = replacement;
      return next;
    });
    toast.success(`"${oldProduct.name}" با "${replacement.name}" جایگزین شد`);
  };

  const currentProducts = products[activeCat] || [];
  const stageConfig = STAGE_CONFIG[currentStage];
  const analytics = roomAnalytics;
  const generatedTotal = generatedProducts.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const isOverBudget = budget > 0 && generatedTotal > budget;
  const budgetDiff = generatedTotal - budget;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      {/* ===== HERO SECTION (Conversion-focused) ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/5 via-background to-background pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent/30 rounded-full px-5 py-2 mb-5">
              <Sparkles size={16} className="text-accent" />
              <span className="text-accent text-sm font-medium">طراح هوشمند هومینو</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
              قبل از خرید، خانه‌ات را <span className="text-accent">هوشمندانه طراحی کن</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              با هوش مصنوعی هومینو، محصولات واقعی بازار را قبل از خرید در خانه‌ات ببین.
              عکس فضای مورد نظر را آپلود کن، سبک دلخواه را انتخاب کن — ما محصولات واقعی را در تصویر تو می‌چینیم.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => inputRef.current?.click()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-4 px-8 rounded-2xl text-lg flex items-center gap-3 transition-all shadow-xl shadow-accent/25 hover:shadow-accent/35"
              >
                <Upload size={22} />
                شروع طراحی با هوش مصنوعی
              </button>
              <Link to="/shops" className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-2 transition-colors">
                <Store size={16} /> مشاهده فروشگاه‌ها
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> محصولات واقعی بازار</span>
              <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> طراحی در لحظه</span>
              <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> خرید مستقیم</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MAIN DESIGN PANEL ===== */}
      <main className="container mx-auto px-6 pb-20 -mt-4 relative z-20">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors">
          <ArrowLeft size={16} /> بازگشت به خانه
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* ===== LEFT COLUMN: Workflow Steps ===== */}
          <div className="lg:col-span-3 space-y-8">

            {/* Step 1: Upload Image */}
            <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">۱</span>
                عکس فضای خانه را آپلود کن
              </h2>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className={cn(
                  "relative cursor-pointer border-2 border-dashed rounded-2xl aspect-video flex items-center justify-center bg-muted/30 hover:border-accent transition-all overflow-hidden group",
                  imageBase64 ? "border-accent/50" : "border-border"
                )}
              >
                {imageBase64 ? (
                  <>
                    <img src={imageBase64} alt="فضای آپلود شده" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold bg-black/50 px-4 py-2 rounded-xl">
                        کلیک برای تغییر عکس
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="text-accent" size={28} />
                    </div>
                    <p className="text-foreground font-medium mb-1">عکس فضای مورد نظر را آپلود کنید</p>
                    <p className="text-sm text-muted-foreground">برای آپلود کلیک کنید یا عکس را اینجا بکشید</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">فرمت‌های مجاز: JPG, PNG</p>
                  </div>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            </section>

            {/* Step 2: Choose Style */}
            <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">۲</span>
                سبک دکوراسیون را انتخاب کن
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={cn(
                      "relative text-right rounded-xl border-2 p-4 transition-all duration-200 group",
                      style === s.id
                        ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                        : "border-border/60 bg-card hover:border-accent/40 hover:bg-accent/5"
                    )}
                  >
                    <span className="text-2xl mb-2 block">{s.icon}</span>
                    <p className="font-bold text-sm mb-0.5">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{s.desc}</p>
                    {style === s.id && (
                      <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Budget */}
            <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">۳</span>
                بودجه خود را مشخص کن
              </h2>
              <BudgetInput value={budget} onChange={setBudget} label="حداکثر بودجه مورد نظر برای این طراحی" />
            </section>

            {/* Step 4: Choose Products */}
            <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">۴</span>
                وسایل مورد نظر را از بازار انتخاب کن
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                محصولات واقعی از فروشندگان هومینو — می‌توانی بدون انتخاب محصول هم طراحی بزنی
              </p>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORIES.map((c) => {
                  const count = (products[c.slug] || []).length;
                  const sel = selectedList.filter((p) => p.category_id === catMap[c.slug]).length;
                  return (
                    <button key={c.slug} onClick={() => setActiveCat(c.slug)}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-sm flex items-center gap-2 transition-all",
                        activeCat === c.slug
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-accent/50"
                      )}>
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                      <span className="text-xs opacity-70">({count})</span>
                      {sel > 0 && <span className="text-xs bg-accent text-accent-foreground rounded-full px-1.5 py-0.5">{sel}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Products grid */}
              {currentProducts.length === 0 ? (
                <div className="text-center py-10 bg-muted/20 border border-border/40 rounded-2xl text-muted-foreground text-sm">
                  هنوز محصولی در این دسته ثبت نشده. می‌توانی بدون انتخاب محصول هم طراحی بزنی.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {currentProducts.map((p) => {
                    const isSel = !!selected[p.id];
                    return (
                      <button key={p.id} onClick={() => toggleProduct(p)}
                        className={cn(
                          "relative text-right rounded-xl border overflow-hidden transition-all bg-card group",
                          isSel ? "border-accent ring-2 ring-accent/40" : "border-border/60 hover:border-accent/50"
                        )}>
                        <div className="aspect-square bg-muted overflow-hidden">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />}
                        </div>
                        <div className="p-2.5">
                          <div className="text-xs font-medium line-clamp-1 mb-0.5">{p.name}</div>
                          <div className="text-xs text-accent font-bold">{fmt(p.price)}</div>
                        </div>
                        {isSel && (
                          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg">
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 5: Prompt */}
            <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">۵</span>
                توضیحات اضافه (دلخواه)
              </h2>
              <AIPromptBox value={prompt} onChange={setPrompt} />
            </section>

            {/* Generate Button */}
            <button
              onClick={() => generate("standard")}
              disabled={loading || polishing || !imageBase64}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all text-lg shadow-xl shadow-accent/20 hover:shadow-accent/30"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={22} /> در حال طراحی هوشمند...</>
              ) : (
                <><Wand2 size={22} /> شروع طراحی با هوش مصنوعی</>
              )}
            </button>

            {/* Progress */}
            {loading && (
              <div className="bg-card border border-accent/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin text-accent" size={22} />
                  <div>
                    <p className="font-bold text-sm text-foreground">{stageConfig.label}</p>
                    <p className="text-xs text-muted-foreground">لطفاً صبر کنید...</p>
                  </div>
                </div>
                <Progress value={stageConfig.progress} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {STAGES.filter(s => s !== "UPLOADING").map((s) => {
                    const stageIdx = STAGES.indexOf(currentStage);
                    const sIdx = STAGES.indexOf(s);
                    const done = sIdx <= stageIdx;
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
          </div>

          {/* ===== RIGHT COLUMN: Result + Shopping Summary ===== */}
          <aside className="lg:col-span-2 space-y-6 lg:sticky lg:top-24 self-start">

            {/* Selected products summary */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <ShoppingBag size={18} className="text-accent" />
                  محصولات انتخاب شده
                  {selectedList.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{selectedList.length}</Badge>
                  )}
                </h3>
                {selectedList.length > 0 && (
                  <button onClick={() => setSelected({})} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    پاک کردن همه
                  </button>
                )}
              </div>
              {selectedList.length === 0 ? (
                <p className="text-xs text-muted-foreground">هنوز محصولی انتخاب نشده. می‌تونی بدون محصول هم طراحی بزنی.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {selectedList.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5 text-xs bg-muted/30 rounded-xl p-2">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                        {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="line-clamp-1 font-medium">{p.name}</div>
                        <div className="text-accent font-bold">{fmt(p.price)}</div>
                      </div>
                      <button onClick={() => toggleProduct(p)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedList.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">جمع کل</span>
                    <span className="font-bold text-accent">{fmt(total)}</span>
                  </div>
                  {budget > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">بودجه</span>
                      <span className={cn("font-bold", total <= budget ? "text-emerald" : "text-red-500")}>{fmt(budget)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Generate button (mobile sticky) */}
            {!loading && !polishing && (
              <button
                onClick={() => generate("standard")}
                disabled={!imageBase64}
                className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-base shadow-lg shadow-accent/20 lg:hidden"
              >
                <Wand2 size={20} /> تولید طراحی
              </button>
            )}

            {/* Result Section */}
            <div className="space-y-5">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Sparkles size={20} className="text-accent" />
                نتیجه طراحی
              </h3>

              {/* Generated Image */}
              <div className="relative bg-card border border-border/60 rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px] shadow-sm">
                {polishing && (
                  <div className="text-center p-8 z-10 bg-card/80 backdrop-blur-sm w-full h-full absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-accent mx-auto mb-4" size={48} />
                    <p className="text-lg font-bold text-foreground mb-2">بهبود جزئیات طراحی...</p>
                    <p className="text-sm text-muted-foreground">بهبود نور، بافت و مواد</p>
                  </div>
                )}

                {resultImage && !loading && !polishing ? (
                  <BeforeAfterSlider
                    beforeImage={imageBase64!}
                    afterImage={resultImage}
                    onConfirm={handleConfirm}
                    onPolish={handlePolish}
                  />
                ) : !loading && !polishing && (
                  <div className="text-center p-12">
                    <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Wand2 className="text-accent/60" size={40} />
                    </div>
                    <p className="text-muted-foreground font-medium">طراحی جدید اینجا نمایش داده می‌شود</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">عکس را آپلود کن و روی دکمه تولید کلیک کن</p>
                  </div>
                )}
              </div>

              {/* Style + Budget Badges */}
              {resultImage && !loading && !polishing && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-accent/10 text-accent border-accent/20">
                    <Palette size={12} /> سبک {STYLES.find(s => s.id === style)?.label}
                  </Badge>
                  {budget > 0 && (
                    <Badge variant="secondary" className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-emerald/10 text-emerald border-emerald/20">
                      <ShoppingBag size={12} /> بودجه: {fmt(budget)}
                    </Badge>
                  )}
                  {generatedProducts.length > 0 && (
                    <Badge variant="secondary" className="text-xs px-3 py-1.5 flex items-center gap-1.5">
                      <Store size={12} /> {generatedProducts.length} محصول
                    </Badge>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {resultImage && !loading && !polishing && (
                <div className="flex gap-2">
                  <button onClick={download} className="flex-1 bg-card border border-border hover:border-accent text-foreground py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
                    <Download size={16} /> دانلود
                  </button>
                  <button onClick={() => setSaveDialogOpen(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm">
                    <Save size={16} /> ذخیره
                  </button>
                  <button onClick={() => generate("standard")} className="flex-1 bg-accent text-accent-foreground py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm hover:bg-accent/90">
                    <RefreshCw size={16} /> طراحی مجدد
                  </button>
                </div>
              )}

              {/* ===== SHOPPING SUMMARY ===== */}
              {resultImage && !loading && !polishing && generatedProducts.length > 0 && (
                <section className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <ShoppingBag size={18} className="text-accent" />
                    خلاصه خرید این طراحی
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    محصولات واقعی استفاده شده در این طراحی — همه از بازار هومینو
                  </p>

                  {/* Product Usage Summary Bar */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 bg-muted/30 rounded-xl p-3">
                    <Package2 size={14} className="text-accent" />
                    <span><strong className="text-foreground">{generatedProducts.length}</strong> محصول</span>
                    <span className="opacity-30">|</span>
                    <Store size={12} className="text-accent" />
                    <span><strong className="text-foreground">{new Set(generatedProducts.map(p => p.profile_id)).size}</strong> فروشنده</span>
                    <span className="opacity-30">|</span>
                    <span className="text-accent font-bold">{fmt(generatedTotal)}</span>
                  </div>

                  {/* Product List */}
                  <div className="space-y-3 mb-4">
                    {generatedProducts.map((p, idx) => (
                      <div key={p.id} className="bg-muted/20 border border-border/40 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                            {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-sm font-bold line-clamp-1">{p.name}</p>
                              <Badge variant="secondary" className="text-[8px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20">
                                محصول بازار
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <Store size={10} />
                              <span>{p.store_name || storeNames[p.profile_id || ""] || `فروشنده ${(p.profile_id || "").slice(-4)}`}</span>
                              <span className="opacity-30">•</span>
                              <span>{CATEGORIES.find(c => c.slug === Object.keys(catMap).find(s => catMap[s] === p.category_id))?.label || "عمومی"}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-accent">{fmt(p.price)}</div>
                            <button
                              onClick={() => handleOpenReplace(p)}
                              className="text-[10px] text-muted-foreground hover:text-accent transition-colors mt-0.5"
                            >
                              تعویض
                            </button>
                          </div>
                        </div>

                        {/* ===== STORE & PRICE COMPARISON ===== */}
                        {storeOffers[p.id] && storeOffers[p.id].length > 0 && (
                          <>
                            <button
                              onClick={() => setExpandedStore(expandedStore === p.id ? null : p.id)}
                              className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground hover:bg-muted/30 transition-colors border-t border-border/20"
                            >
                              <span className="flex items-center gap-1">
                                <Store size={10} />
                                مقایسه قیمت در {storeOffers[p.id].length} فروشگاه دیگر
                              </span>
                              {expandedStore === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            {expandedStore === p.id && (
                              <div className="px-3 pb-3 space-y-1.5 border-t border-border/20 pt-2">
                                {storeOffers[p.id].map((offer, oi) => (
                                  <div key={oi} className={cn(
                                    "flex items-center justify-between p-2 rounded-lg text-[10px]",
                                    offer.isBestPrice ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900" : "bg-muted/20"
                                  )}>
                                    <div className="flex items-center gap-2">
                                      <Store size={10} className="text-muted-foreground" />
                                      <span className="font-medium">{offer.storeName}</span>
                                      {offer.isBestPrice && (
                                        <Badge className="text-[8px] px-1.5 py-0 bg-emerald-500 text-white border-0">
                                          بهترین قیمت
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="flex items-center gap-0.5 text-muted-foreground">
                                        <Star size={8} /> {offer.rating}
                                      </span>
                                      <span className="flex items-center gap-0.5 text-muted-foreground">
                                        <Truck size={8} /> {offer.delivery}
                                      </span>
                                      <span className={cn("font-bold", offer.isBestPrice ? "text-emerald" : "text-foreground")}>
                                        {fmt(offer.price)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total Cost + Budget Comparison */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">هزینه کل محصولات</span>
                      <span className="font-bold text-lg text-accent">{fmt(generatedTotal)}</span>
                    </div>
                    {budget > 0 && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">بودجه تعیین شده</span>
                          <span className="font-bold">{fmt(budget)}</span>
                        </div>
                        <div className={cn(
                          "flex items-center justify-between text-sm p-3 rounded-xl",
                          isOverBudget
                            ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                            : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                        )}>
                          {isOverBudget ? (
                            <>
                              <span className="flex items-center gap-1.5 font-bold">
                                <AlertTriangle size={14} /> این طراحی از بودجه شما بیشتر است
                              </span>
                              <span className="font-bold">{fmt(budgetDiff)} بیشتر</span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center gap-1.5 font-bold">
                                <Check size={14} /> در محدوده بودجه شما
                              </span>
                              <span className="font-bold">{fmt(budget - generatedTotal)} باقی‌مانده</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Budget Optimization */}
                  {isOverBudget && (
                    <div className="mt-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
                      <h4 className="text-sm font-bold flex items-center gap-1.5 mb-2 text-amber-700 dark:text-amber-400">
                        <TrendingDown size={14} /> بهینه‌سازی بودجه
                      </h4>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mb-3">
                        محصولات زیر را با جایگزین‌های ارزان‌تر عوض کن تا در بودجه بمانی
                      </p>
                      <div className="space-y-2">
                        {generatedProducts.map((p) => {
                          if (!p.category_id) return null;
                          const catSlug = Object.keys(catMap).find((s) => catMap[s] === p.category_id);
                          if (!catSlug) return null;
                          const cheaper = (products[catSlug] || [])
                            .filter(c => c.id !== p.id && (Number(c.price) || 0) < (Number(p.price) || 0))
                            .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
                          if (cheaper.length === 0) return null;
                          return (
                            <div key={p.id} className="flex items-center justify-between bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="line-through text-muted-foreground">{fmt(p.price)}</span>
                                <ArrowLeft size={10} className="text-emerald" />
                                <span className="font-bold text-emerald">{fmt(cheaper[0].price)}</span>
                                <span className="text-muted-foreground">- {cheaper[0].name}</span>
                              </div>
                              <button
                                onClick={() => handleApplyCheaperAlternative(p)}
                                className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded-lg transition-colors"
                              >
                                جایگزین کن
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Buy This Design CTA */}
                  <div className="mt-4 space-y-3">
                    <button
                      onClick={buyTheLook}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-lg shadow-lg shadow-accent/20"
                    >
                      <ShoppingBag size={22} />
                      خرید این چیدمان
                    </button>
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                      <span>هزینه کل: <strong className="text-foreground">{fmt(generatedTotal)}</strong></span>
                      <span>تعداد فروشندگان: <strong className="text-foreground">{new Set(generatedProducts.map(p => p.profile_id)).size}</strong></span>
                    </div>
                  </div>
                </section>
              )}

              {/* Analytics Section */}
              {(roomTip || analytics) && (
                <div className="space-y-3">
                  <div className="flex gap-1 bg-card border border-border/60 rounded-xl p-1">
                    <button onClick={() => setAnalyticsTab("tip")}
                      className={cn("flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                        analyticsTab === "tip" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                      )}>
                      <Lightbulb size={14} /> تحلیل فضا
                    </button>
                    {analytics?.colorPalette && analytics.colorPalette.length > 0 && (
                      <button onClick={() => setAnalyticsTab("colors")}
                        className={cn("flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                          analyticsTab === "colors" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                        )}>
                        <Palette size={14} /> پالت رنگی
                      </button>
                    )}
                    {analytics?.spatialAdvice && (
                      <button onClick={() => setAnalyticsTab("advice")}
                        className={cn("flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                          analyticsTab === "advice" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                        )}>
                        <Target size={14} /> چیدمان
                      </button>
                    )}
                  </div>

                  {analyticsTab === "tip" && roomTip && (
                    <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex gap-3 items-start">
                      <Lightbulb className="text-accent shrink-0" size={20} />
                      <div>
                        <div className="text-xs font-bold text-accent mb-1">تحلیل فضا:</div>
                        <p className="text-sm text-foreground leading-relaxed">{roomTip}</p>
                      </div>
                    </div>
                  )}

                  {analyticsTab === "colors" && analytics?.colorPalette && (
                    <div className="bg-card border border-border/60 rounded-2xl p-4">
                      <div className="text-xs font-bold text-accent mb-3">پالت رنگی پیشنهادی:</div>
                      <div className="flex gap-3 flex-wrap">
                        {analytics.colorPalette.map((hex: string, idx: number) => (
                          <div key={idx} className="flex flex-col items-center gap-1.5">
                            <div className="w-12 h-12 rounded-xl shadow-md border border-border" style={{ backgroundColor: hex }} />
                            <span className="text-[10px] text-muted-foreground font-mono">{hex}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analyticsTab === "advice" && analytics?.spatialAdvice && (
                    <div className="bg-card border border-border/60 rounded-2xl p-4 flex gap-3 items-start">
                      <Target className="text-accent shrink-0" size={20} />
                      <div>
                        <div className="text-xs font-bold text-accent mb-1">توصیه چیدمان:</div>
                        <p className="text-sm text-foreground leading-relaxed">{analytics.spatialAdvice}</p>
                      </div>
                    </div>
                  )}

                  {analytics?.styleMatch !== undefined && (
                    <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="text-accent" size={18} />
                        <span className="text-xs font-medium">تناسب با سبک {STYLES.find(s => s.id === style)?.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${analytics.styleMatch}%` }} />
                        </div>
                        <span className="text-xs font-bold text-accent">{analytics.styleMatch}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Economy & Premium Version */}
              {resultImage && !loading && !polishing && generatedProducts.length > 0 && (
                <EconomyPremiumToggle currentProducts={generatedProducts} onReplace={(products) => setGeneratedProducts(products)} />
              )}

              {/* Financial Report */}
              {resultImage && !loading && !polishing && generatedProducts.length > 0 && (
                <FinancialReport products={generatedProducts} />
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Dialogs - Unchanged */}
      <Dialog open={maskDialogOpen} onOpenChange={setMaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit3 size={18} className="text-accent" /> ویرایش بخش خاصی از تصویر</DialogTitle>
            <DialogDescription>روی بخش‌هایی از تصویر که می‌خواهید تغییر کنند بکشید. بقیه تصویر بدون تغییر می‌ماند.</DialogDescription>
          </DialogHeader>
          {imageBase64 && <MaskCanvas imageBase64={imageBase64} onMaskGenerated={handleMaskGenerated} onCancel={() => setMaskDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Save size={18} className="text-emerald-600" /> {currentProjectId ? "ویرایش پروژه" : "ذخیره پروژه"}</DialogTitle>
            <DialogDescription>برای پروژه خود یک نام انتخاب کنید تا بعداً بتوانید به راحتی آن را پیدا کنید.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input placeholder="مثلاً: طراحی اتاق پذیرایی مدرن" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} className="w-full" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveProject(); }} />
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="flex-1">انصراف</Button>
            <Button onClick={handleSaveProject} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"><Save size={16} className="ml-1" /> {currentProjectId ? "به‌روزرسانی" : "ذخیره"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw size={18} className="text-accent" /> تعویض محصول: {replacingProduct?.old.name}</DialogTitle>
            <DialogDescription>محصول جدیدی را از دسته‌بندی مشابه انتخاب کنید تا تنها آن محصول در تصویر طراحی جایگزین شود.</DialogDescription>
          </DialogHeader>
          {replacing && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-accent" size={40} />
              <p className="font-bold text-sm">در حال جایگزینی محصول در تصویر...</p>
              <p className="text-xs text-muted-foreground">بقیه اجزای طراحی بدون تغییر می‌مانند</p>
            </div>
          )}
          {!replacing && (
            <div className="py-4">
              {replacingProduct?.categorySlug && CATEGORIES.find(c => c.slug === replacingProduct.categorySlug) && (
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <span className="text-muted-foreground">دسته:</span>
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    {CATEGORIES.find(c => c.slug === replacingProduct?.categorySlug)?.icon}{' '}
                    {CATEGORIES.find(c => c.slug === replacingProduct?.categorySlug)?.label}
                  </Badge>
                  <span className="text-muted-foreground text-xs mr-2">({replaceCategoryProds.length} محصول)</span>
                </div>
              )}
              {replaceCategoryProds.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Search size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">محصول دیگری در این دسته موجود نیست.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {replaceCategoryProds.map((prod) => (
                    <button key={prod.id} onClick={() => handleReplaceConfirm(prod)}
                      className="text-right bg-card border border-border hover:border-accent hover:shadow-md rounded-xl overflow-hidden transition-all duration-200 group">
                      <div className="aspect-square bg-muted overflow-hidden">
                        {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package2 size={24} /></div>}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-bold line-clamp-1 mb-1">{prod.name}</p>
                        <p className="text-xs text-accent">{fmt(prod.price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceDialogOpen(false)} className="flex-1" disabled={replacing}>انصراف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AIDesign;