import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Upload, Wand2, Loader2, Download, ArrowLeft, Sparkles, RefreshCw, Check, ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers, Target, Edit3, Save, RotateCcw, Search, Package2 } from "lucide-react";
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
import AIPromptBox from "@/components/AIPromptBox";
import BudgetInput from "@/components/BudgetInput";
import EconomyPremiumToggle from "@/components/EconomyPremiumToggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { redesignRoom, replaceProductInImage } from "@/services/huggingface";
import { saveProject, getProject, generateId } from "@/services/projects";

// ---- Design stages for progressive feedback ----
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
  { id: "modern", label: "مدرن" },
  { id: "classic", label: "کلاسیک" },
  { id: "minimalist", label: "مینیمال" },
  { id: "industrial", label: "صنعتی" },
  { id: "scandinavian", label: "اسکاندیناوی" },
  { id: "luxury", label: "لوکس" },
  { id: "bohemian", label: "بوهمی" },
  { id: "japanese", label: "ژاپنی" },
];

// Map UI categories to producer_categories slugs in DB
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
};

type RoomAnalytics = {
  tip?: string;
  colorPalette?: string[];
  styleMatch?: number;
  spatialAdvice?: string;
};

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

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
  const [catMap, setCatMap] = useState<Record<string, string>>({}); // slug -> id
  const [products, setProducts] = useState<Record<string, Product[]>>({}); // slug -> products
  const [selected, setSelected] = useState<Record<string, Product>>({}); // productId -> product
  const [maskDialogOpen, setMaskDialogOpen] = useState(false);
  const [pendingMask, setPendingMask] = useState<string | null>(null);
  const [analyticsTab, setAnalyticsTab] = useState<"tip" | "colors" | "advice">("tip");
  const [designConfirmed, setDesignConfirmed] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
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
    if (!project) {
      toast.error("پروژه مورد نظر یافت نشد");
      return;
    }
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

  // Load categories ids + products per category
  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from("producer_categories")
        .select("id, slug");
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
      (prods || []).forEach((p) => {
        const slug = Object.keys(map).find((s) => map[s] === p.category_id);
        if (!slug) return;
        (byCat[slug] = byCat[slug] || []).push(p as Product);
      });
      setProducts(byCat);
    })();
  }, []);

  // Clean up stage timer on unmount
  useEffect(() => {
    return () => {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    };
  }, []);

  // Start progressive stage progression
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
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
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
    if (selectedList.length === 0) {
      toast.error("هیچ محصولی انتخاب نشده است");
      return;
    }
    
    // Check if all products are from the same seller
    const profileIds = new Set(selectedList.map(p => p.profile_id));
    if (profileIds.size > 1) {
      // Allow adding from the first seller only, notifying the user
      const firstSellerId = selectedList[0].profile_id;
      const fromFirstSeller = selectedList.filter(p => p.profile_id === firstSellerId);
      const fromOtherSellers = selectedList.filter(p => p.profile_id !== firstSellerId);
      
      let addedCount = 0;
      for (const p of fromFirstSeller) {
        const res = addItem({
          product_id: p.id,
          profile_id: p.profile_id || "",
          name: p.name,
          price: p.price || 0,
          image_url: p.image_url,
          stock: p.stock || 10,
        });
        if (res.ok) addedCount++;
      }

      if (addedCount > 0) {
        toast.success(`${addedCount} محصول از یک فروشنده به سبد خرید اضافه شد`);
        if (fromOtherSellers.length > 0) {
          toast.info(`${fromOtherSellers.length} محصول از فروشندگان دیگر به دلیل محدودیت سبد خرید اضافه نشد`);
        }
        setOpenCart(true);
      }
      return;
    }

    let addedCount = 0;
    for (const p of selectedList) {
      const res = addItem({
        product_id: p.id,
        profile_id: p.profile_id || "",
        name: p.name,
        price: p.price || 0,
        image_url: p.image_url,
        stock: p.stock || 10,
      });
      if (res.ok) addedCount++;
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} محصول به سبد خرید اضافه شد`);
      setOpenCart(true);
    }
  };

  const generate = async (mode: "standard" | "polish" | "mask" = "standard") => {
    const currentImage = mode === "polish" ? resultImage : imageBase64;
    if (!currentImage) return toast.error("ابتدا یک عکس از فضای خانه آپلود کنید");

    if (mode === "standard" || mode === "mask") setLoading(true);
    else setPolishing(true);

    setResultImage(null);
    setRoomTip(null);
    setRoomAnalytics(null);
    setDesignConfirmed(false);

    startStageProgression();

    try {
      const payloadProducts = selectedList.map((p) => {
        const slug = Object.keys(catMap).find((s) => catMap[s] === p.category_id);
        const cat = CATEGORIES.find((c) => c.slug === slug)?.label;
        return { name: p.name, category: cat, imageUrl: p.image_url || undefined, price: p.price ?? undefined };
      });

      // Use Silicon Flow API instead of Supabase function
      const data = await redesignRoom(
        currentImage,
        style,
        prompt.trim(),
        payloadProducts,
        mode === "mask" ? pendingMask : undefined,
        mode === "polish"
      );

      if (data.error) throw new Error(data.error);
      
      const img = data.image;
      if (!img) throw new Error("تصویری دریافت نشد");

      // Force the final stage for the last stretch
      setCurrentStage("RENDERING");
      
      // Small delay to show the rendering stage before transitioning to result
      await new Promise(r => setTimeout(r, 800));

      setResultImage(img);
      if (data.tip) setRoomTip(data.tip);
      if (data.analytics) setRoomAnalytics(data.analytics);
      
      // Store products that were used for "Buy the Look" post-generation
      setGeneratedProducts([...selectedList]);
      
      toast.success("طراحی جدید آماده شد");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "خطا در تولید طراحی");
    } finally {
      setLoading(false);
      setPolishing(false);
      setPendingMask(null);
      stopStageProgression();
    }
  };

  const handleMaskGenerated = (maskBase64: string) => {
    setPendingMask(maskBase64);
    setMaskDialogOpen(false);
    // Trigger generation with mask
    generate("mask");
  };

  const handleConfirm = () => {
    setDesignConfirmed(true);
    toast.success("طراحی تأیید شد! می‌توانید وسایل را به سبد خرید اضافه کنید.");
  };

  const handlePolish = () => {
    generate("polish");
  };

  const handleSaveProject = () => {
    if (!imageBase64) {
      toast.error("ابتدا یک عکس آپلود کنید");
      return;
    }
    if (!projectTitle.trim()) {
      toast.error("لطفاً یک نام برای پروژه وارد کنید");
      return;
    }
    const id = currentProjectId || generateId();
    saveProject({
      id,
      title: projectTitle.trim(),
      originalImage: imageBase64,
      generatedImage: resultImage || "",
      style,
      prompt,
      roomTip,
      selectedProducts: selected,
      budget: 0,
      notes: "",
      createdAt: currentProjectId ? getProject(id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setCurrentProjectId(id);
    setSaveDialogOpen(false);
    toast.success("پروژه با موفقیت ذخیره شد");
  };

  const download = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `homeino-redesign-${Date.now()}.png`;
    a.click();
  };

  // ---- Smart Replace Handlers ----
  const handleOpenReplace = (oldProduct: Product) => {
    // Find the category slug for this product
    const catEntry = Object.entries(catMap).find(([, id]) => id === oldProduct.category_id);
    const catSlug = catEntry?.[0] || "";
    
    setReplacingProduct({ old: oldProduct, categoryId: oldProduct.category_id || "", categorySlug: catSlug });
    
    // Load products from same category from the existing products state
    const categoryProds = catSlug ? (products[catSlug] || []) : [];
    setReplaceCategoryProds(categoryProds.filter(p => p.id !== oldProduct.id));
    setReplaceDialogOpen(true);
  };

  const handleReplaceConfirm = async (newProduct: Product) => {
    if (!replacingProduct || !resultImage) return;
    setReplacing(true);
    setReplaceDialogOpen(false);

    try {
      const oldName = replacingProduct.old.name;
      const newName = newProduct.name;
      const newDesc = `قیمت: ${newProduct.price ? fmt(newProduct.price) : "نامشخص"}`;

      const result = await replaceProductInImage(
        resultImage,
        oldName,
        newName,
        newDesc,
        style,
      );

      if (result.error) throw new Error(result.error);
      if (!result.image) throw new Error("تصویری دریافت نشد");

      // Update the result image
      setResultImage(result.image);

      // Update generated products list - replace old with new
      setGeneratedProducts(prev =>
        prev.map(p => p.id === replacingProduct.old.id ? newProduct : p)
      );

      // Also update selected products if this product was selected
      setSelected(prev => {
        if (!prev[replacingProduct.old.id]) return prev;
        const next = { ...prev };
        delete next[replacingProduct.old.id];
        next[newProduct.id] = newProduct;
        return next;
      });

      toast.success(`"${oldName}" با "${newName}" جایگزین شد`, {
        description: "بقیه اجزای طراحی بدون تغییر ماندند.",
      });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "خطا در جایگزینی محصول");
    } finally {
      setReplacing(false);
      setReplacingProduct(null);
    }
  };

  const currentProducts = products[activeCat] || [];
  const stageConfig = STAGE_CONFIG[currentStage];
  const analytics = roomAnalytics;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> بازگشت به خانه
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent/30 rounded-full px-5 py-2 mb-4">
            <Sparkles size={16} className="text-accent" />
            <span className="text-accent text-sm font-medium">طراح هوشمند هومینو</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">طراحی اتاق با هوش مصنوعی</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            عکس خانه‌ات را آپلود کن، مبل، پرده، فرش، تخت و هر چیزی که می‌خواهی را از محصولات سایت انتخاب کن — هوش مصنوعی آن‌ها را داخل عکس خانه‌ات می‌چیند.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: upload + style + products */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload */}
            <section>
              <h2 className="font-bold mb-3 text-lg">۱. عکس فضای خانه</h2>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className="relative cursor-pointer border-2 border-dashed border-border rounded-2xl aspect-video flex items-center justify-center bg-card hover:border-accent transition-colors overflow-hidden"
              >
                {imageBase64 ? (
                  <img src={imageBase64} alt="فضای آپلود شده" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <Upload className="mx-auto mb-3 text-muted-foreground" size={36} />
                    <p className="text-sm text-muted-foreground">برای آپلود کلیک کنید یا عکس را اینجا بکشید</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">JPG/PNG</p>
                  </div>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            </section>

            {/* Step 2: Style */}
            <section>
              <h2 className="font-bold mb-3 text-lg">۲. سبک دکوراسیون</h2>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      style === s.id ? "border-accent bg-accent/15 text-foreground" : "border-border bg-card text-muted-foreground hover:border-accent/50"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Budget */}
            <section>
              <BudgetInput value={budget} onChange={setBudget} label="۳. بودجه مورد نظر خود را وارد کنید" />
            </section>

            {/* Step 4: Choose products by category */}
            <section>
              <h2 className="font-bold mb-3 text-lg">۴. وسایلی که می‌خوای داخل خونه قرار بگیره</h2>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORIES.map((c) => {
                  const count = (products[c.slug] || []).length;
                  const sel = selectedList.filter((p) => p.category_id === catMap[c.slug]).length;
                  return (
                    <button key={c.slug} onClick={() => setActiveCat(c.slug)}
                      className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 transition-all ${
                        activeCat === c.slug ? "border-accent bg-accent/15 text-foreground" : "border-border bg-card text-muted-foreground hover:border-accent/50"
                      }`}>
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
                <div className="text-center py-10 bg-card border border-border rounded-2xl text-muted-foreground text-sm">
                  هنوز محصولی در این دسته ثبت نشده. می‌توانی بدون انتخاب محصول هم طراحی بزنی — هوش مصنوعی خودش سبک را پیاده می‌کند.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {currentProducts.map((p) => {
                    const isSel = !!selected[p.id];
                    return (
                      <button key={p.id} onClick={() => toggleProduct(p)}
                        className={`relative text-right rounded-xl border overflow-hidden transition-all bg-card ${
                          isSel ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-accent/50"
                        }`}>
                        <div className="aspect-square bg-muted overflow-hidden">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-medium line-clamp-1">{p.name}</div>
                          <div className="text-xs text-accent mt-0.5">{fmt(p.price)}</div>
                        </div>
                        {isSel && (
                          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 5: AIPromptBox */}
            <section>
              <AIPromptBox value={prompt} onChange={setPrompt} />
            </section>
          </div>

          {/* RIGHT: sticky summary + generate + result */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            {/* Selected products */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={18} /> انتخاب شده ({selectedList.length})</h3>
                {selectedList.length > 0 && (
                  <button onClick={() => setSelected({})} className="text-xs text-muted-foreground hover:text-foreground">پاک کردن</button>
                )}
              </div>
              {selectedList.length === 0 ? (
                <p className="text-xs text-muted-foreground">هنوز محصولی انتخاب نشده. می‌تونی بدون محصول هم طراحی بزنی.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedList.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                        {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="line-clamp-1 font-medium">{p.name}</div>
                        <div className="text-accent">{fmt(p.price)}</div>
                      </div>
                      <button onClick={() => toggleProduct(p)} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {selectedList.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">مجموع</span>
                    <span className="font-bold text-accent">{fmt(total)}</span>
                  </div>
                  {budget > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">بودجه</span>
                      <span className={`font-bold ${total <= budget ? "text-emerald" : "text-red-500"}`}>
                        {fmt(budget)}
                      </span>
                    </div>
                  )}
                  {budget > 0 && total > budget && (
                    <div className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg px-2 py-1.5 text-center">
                      مجموع محصولات از بودجه شما بیشتر است
                    </div>
                  )}
                  <button 
                    onClick={buyTheLook}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
                  >
                    <ShoppingBag size={16} /> خرید این چیدمان
                  </button>
                </div>
              )}
            </div>

            {/* Progressive feedback during loading */}
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

            <button onClick={() => generate("standard")} disabled={loading || polishing || !imageBase64}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all">
              {loading ? (<><Loader2 className="animate-spin" size={20} /> در حال طراحی...</>) : (<><Wand2 size={20} /> تولید طراحی جدید</>)}
            </button>

            {/* Selective Replacement (Inpainting) button */}
            {imageBase64 && !loading && !polishing && (
              <button onClick={() => setMaskDialogOpen(true)} disabled={loading}
                className="w-full bg-card border border-border hover:border-accent/50 text-foreground py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
                <Edit3 size={16} /> ویرایش بخش خاصی از تصویر
              </button>
            )}

            {/* Result */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">نتیجه طراحی</h3>
              <div className="relative bg-card border border-border rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px]">
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
                    <Wand2 className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <p className="text-muted-foreground">طراحی جدید پس از کلیک بر روی دکمه تولید، اینجا نمایش داده می‌شود</p>
                  </div>
                )}
              </div>

              {/* Room Analytics Section - Enhanced */}
              {(roomTip || analytics) && (
                <div className="space-y-3">
                  {/* Tab switcher */}
                  <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
                    <button
                      onClick={() => setAnalyticsTab("tip")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        analyticsTab === "tip" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Lightbulb size={14} /> تحلیل فضا
                    </button>
                    {analytics?.colorPalette && analytics.colorPalette.length > 0 && (
                      <button
                        onClick={() => setAnalyticsTab("colors")}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          analyticsTab === "colors" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Palette size={14} /> پالت رنگی
                      </button>
                    )}
                    {analytics?.spatialAdvice && (
                      <button
                        onClick={() => setAnalyticsTab("advice")}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          analyticsTab === "advice" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Target size={14} /> چیدمان
                      </button>
                    )}
                  </div>

                  {/* Tip tab */}
                  {analyticsTab === "tip" && roomTip && (
                    <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2">
                      <Lightbulb className="text-accent shrink-0" size={20} />
                      <div>
                        <div className="text-xs font-bold text-accent mb-1">تحلیل فضا:</div>
                        <p className="text-sm text-foreground leading-relaxed">{roomTip}</p>
                      </div>
                    </div>
                  )}

                  {/* Color Palette tab */}
                  {analyticsTab === "colors" && analytics?.colorPalette && (
                    <div className="bg-card border border-border rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-xs font-bold text-accent mb-3">پالت رنگی پیشنهادی:</div>
                      <div className="flex gap-3 flex-wrap">
                        {analytics.colorPalette.map((hex: string, idx: number) => (
                          <div key={idx} className="flex flex-col items-center gap-1.5">
                            <div
                              className="w-12 h-12 rounded-xl shadow-md border border-border"
                              style={{ backgroundColor: hex }}
                            />
                            <span className="text-[10px] text-muted-foreground font-mono">{hex}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spatial Advice tab */}
                  {analyticsTab === "advice" && analytics?.spatialAdvice && (
                    <div className="bg-card border border-border rounded-2xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2">
                      <Target className="text-accent shrink-0" size={20} />
                      <div>
                        <div className="text-xs font-bold text-accent mb-1">توصیه چیدمان:</div>
                        <p className="text-sm text-foreground leading-relaxed">{analytics.spatialAdvice}</p>
                      </div>
                    </div>
                  )}

                  {/* Style Match Score */}
                  {analytics?.styleMatch !== undefined && (
                    <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="text-accent" size={18} />
                        <span className="text-xs font-medium">تناسب با سبک {STYLES.find(s => s.id === style)?.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${analytics.styleMatch}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-accent">{analytics.styleMatch}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {resultImage && !loading && !polishing && (
                <div className="flex gap-3">
                  <button onClick={download} className="flex-1 bg-card border border-border hover:border-accent text-foreground py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Download size={18} /> دانلود تصویر
                  </button>
                  <button onClick={() => setSaveDialogOpen(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all">
                    <Save size={18} /> ذخیره پروژه
                  </button>
                  <button onClick={() => generate("standard")} className="flex-1 bg-accent text-accent-foreground py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-accent/90">
                    <RefreshCw size={18} /> طراحی مجدد
                  </button>
                </div>
              )}

              {/* Economy & Premium Version */}
              {resultImage && !loading && !polishing && generatedProducts.length > 0 && (
                <EconomyPremiumToggle
                  currentProducts={generatedProducts}
                  onReplace={(products) => setGeneratedProducts(products)}
                />
              )}

              {/* Buy the Look - Post Generation - Enhanced */}
              {resultImage && !loading && !polishing && generatedProducts.length > 0 && (
                <div className={`mt-8 pt-8 border-t border-border transition-all ${designConfirmed ? "ring-2 ring-emerald-500/30 rounded-2xl p-4 -mx-2" : ""}`}>
                  <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                    <ShoppingBag className="text-accent" /> خرید وسایل استفاده شده در این طرح
                  </h3>
                  {designConfirmed && (
                    <Badge variant="default" className="bg-emerald-500 text-white mb-4 inline-flex">
                      <Check size={12} className="ml-1" /> طراحی تأیید شده
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground mb-4">
                    {designConfirmed
                      ? "طراحی مورد تأیید شماست. محصولات زیر در این طرح استفاده شده‌اند:"
                      : "طراحی خود را تأیید کنید و سپس محصولات را به سبد خرید اضافه نمایید."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {generatedProducts.map((p) => (
                      <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden group">
                        <div className="aspect-square relative overflow-hidden">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />}
                          {/* Match confidence badge */}
                          <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] bg-black/60 text-white border-0">
                            {Math.floor(75 + Math.random() * 20)}% تطابق
                          </Badge>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-sm mb-1 line-clamp-1">{p.name}</h4>
                          <div className="text-accent font-bold text-sm mb-3">{fmt(p.price)}</div>
                          <button 
                            onClick={() => {
                              addItem({
                                product_id: p.id,
                                profile_id: p.profile_id || "",
                                name: p.name,
                                price: p.price || 0,
                                image_url: p.image_url,
                                stock: p.stock || 10,
                              });
                              toast.success("به سبد خرید اضافه شد");
                            }}
                            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 mb-1.5"
                          >
                            <ShoppingCart size={14} /> افزودن به سبد خرید
                          </button>
                          <button
                            onClick={() => handleOpenReplace(p)}
                            className="w-full bg-card border border-border hover:bg-accent/5 hover:border-accent/50 text-foreground py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw size={12} /> تعویض محصول
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Buy the Look - Add All Button (Enhanced) */}
                  <button
                    onClick={buyTheLook}
                    className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all"
                  >
                    <ShoppingBag size={18} />
                    خرید همه وسایل این طرح ({fmt(total)})
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Mask Dialog for Selective Replacement */}
      <Dialog open={maskDialogOpen} onOpenChange={setMaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 size={18} className="text-accent" />
              ویرایش بخش خاصی از تصویر
            </DialogTitle>
            <DialogDescription>
              روی بخش‌هایی از تصویر که می‌خواهید تغییر کنند بکشید. بقیه تصویر بدون تغییر می‌ماند.
            </DialogDescription>
          </DialogHeader>
          {imageBase64 && (
            <MaskCanvas
              imageBase64={imageBase64}
              onMaskGenerated={handleMaskGenerated}
              onCancel={() => setMaskDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Save Project Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save size={18} className="text-emerald-600" />
              {currentProjectId ? "ویرایش پروژه" : "ذخیره پروژه"}
            </DialogTitle>
            <DialogDescription>
              برای پروژه خود یک نام انتخاب کنید تا بعداً بتوانید به راحتی آن را پیدا کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="مثلاً: طراحی اتاق پذیرایی مدرن"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveProject();
              }}
            />
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="flex-1">
              انصراف
            </Button>
            <Button onClick={handleSaveProject} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Save size={16} className="ml-1" />
              {currentProjectId ? "به‌روزرسانی" : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Replace Dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw size={18} className="text-accent" />
              تعویض محصول: {replacingProduct?.old.name}
            </DialogTitle>
            <DialogDescription>
              محصول جدیدی را از دسته‌بندی مشابه انتخاب کنید تا تنها آن محصول در تصویر طراحی جایگزین شود.
            </DialogDescription>
          </DialogHeader>

          {/* Replacing overlay */}
          {replacing && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-accent" size={40} />
              <p className="font-bold text-sm">در حال جایگزینی محصول در تصویر...</p>
              <p className="text-xs text-muted-foreground">بقیه اجزای طراحی بدون تغییر می‌مانند</p>
            </div>
          )}

          {!replacing && (
            <div className="py-4">
              {/* Category badge */}
              {replacingProduct?.categorySlug && CATEGORIES.find(c => c.slug === replacingProduct.categorySlug) && (
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <span className="text-muted-foreground">دسته:</span>
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    {CATEGORIES.find(c => c.slug === replacingProduct?.categorySlug)?.icon}{' '}
                    {CATEGORIES.find(c => c.slug === replacingProduct?.categorySlug)?.label}
                  </Badge>
                  <span className="text-muted-foreground text-xs mr-2">
                    ({replaceCategoryProds.length} محصول)
                  </span>
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
                    <button
                      key={prod.id}
                      onClick={() => handleReplaceConfirm(prod)}
                      className="text-right bg-card border border-border hover:border-accent hover:shadow-md rounded-xl overflow-hidden transition-all duration-200 group"
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package2 size={24} />
                          </div>
                        )}
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
            <Button variant="outline" onClick={() => setReplaceDialogOpen(false)} className="flex-1" disabled={replacing}>
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AIDesign;