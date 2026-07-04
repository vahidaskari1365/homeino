import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload, Wand2, Loader2, ArrowLeft, Sparkles, RefreshCw,
  ShoppingCart, X, ShoppingBag, Lightbulb, Palette, Layers,
  CheckCircle2, Banknote, Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { validateGeminiResponse } from "@/lib/aiSchemas";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ProductOverlay from "@/components/ProductOverlay";

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

const CATEGORIES = [
  { slug: "furniture",   label: "مبلمان",      icon: "🛋️" },
  { slug: "curtain",     label: "پرده",        icon: "🪟" },
  { slug: "carpet",      label: "فرش",         icon: "🟥" },
  { slug: "lighting",    label: "لوستر",       icon: "💡" },
  { slug: "bedding",     label: "تخت و خواب",  icon: "🛏️" },
  { slug: "plants",      label: "گل و گیاه",   icon: "🪴" },
  { slug: "art",         label: "تابلو",       icon: "🖼️" },
  { slug: "wood-decor",  label: "دکور چوبی",   icon: "🪵" },
  { slug: "accessories", label: "اکسسوری",     icon: "🎀" },
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
};

type GeminiPlacement = {
  product_id: string;
  x: number;     // normalized 0-1
  y: number;     // normalized 0-1
  scale: number; // 0.5-2.0
};

type GeminiResult = {
  consultation: string;
  placements: GeminiPlacement[];
  total_price: number; // always DB-computed, never trusted from AI
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
  const [geminiResult, setGeminiResult]   = useState<GeminiResult | null>(null);
  const [activeCat, setActiveCat]         = useState(CATEGORIES[0].slug);
  const [catMap, setCatMap]               = useState<Record<string, string>>({});
  const [products, setProducts]           = useState<Record<string, Product[]>>({});
  const [selected, setSelected]           = useState<Record<string, Product>>({});
  const [analyticsTab, setAnalyticsTab]   = useState<"consultation" | "placements">("consultation");

  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const { addItem, setOpen: setOpenCart } = useCart();

  // ── load products from Supabase ──
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
    startStageProgression();

    try {
      // Auth check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("برای استفاده از هوش مصنوعی ابتدا وارد حساب کاربری شوید");
        return;
      }

      // Strip data-URL prefix → raw base64
      const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

      // Build product list for Gemini
      const geminiProducts = selectedList.map((p) => {
        const slug = Object.keys(catMap).find((s) => catMap[s] === p.category_id);
        const cat  = CATEGORIES.find((c) => c.slug === slug);
        return {
          id:        p.id,
          name:      p.name,
          category:  cat?.label || "عمومی",
          style,
          price:     p.price || 0,
          image_url: p.image_url || undefined,
          tags:      [] as string[],
        };
      });

      const budgetNum = budget ? parseInt(budget.replace(/\D/g, ""), 10) : undefined;

      // Call the Supabase Edge Function (gemini-decorator)
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

      // ── AI OUTPUT → VALIDATION → SANITIZATION → UI ──────────────────────
      // Never trust the Edge Function payload directly, even though it already
      // validates on its side. Re-validate + sanitize here as a second layer
      // so the UI can NEVER crash from a malformed/unexpected response shape.
      const { ok, data: validated } = validateGeminiResponse(data);

      setGeminiResult(validated as GeminiResult);
      setCurrentStage("RENDERING");
      await new Promise((r) => setTimeout(r, 400));

      if (!ok) {
        toast.error("هوش مصنوعی نتوانست چیدمان دقیقی پیشنهاد دهد. لطفاً دوباره تلاش کنید یا محصولات دیگری انتخاب کنید.");
      } else {
        toast.success("چیدمان هوشمند آماده شد ✨");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "خطا در تولید طراحی");
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

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent/30 rounded-full px-5 py-2 mb-4">
            <Sparkles size={16} className="text-accent" />
            <span className="text-accent text-sm font-medium">طراح هوشمند هومینو · Gemini AI</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">طراحی اتاق با هوش مصنوعی</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            عکس خانه‌ات را آپلود کن، هر تعداد وسیله‌ای که می‌خواهی از بازار انتخاب کن —
            جمینی آن‌ها را هوشمندانه داخل عکس خانه‌ات جایگذاری می‌کند.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
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
                    <p className="text-xs text-muted-foreground/70 mt-1">JPG / PNG</p>
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
                      style === s.id
                        ? "border-accent bg-accent/15 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-accent/50"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Multi-select products */}
            <section>
              <h2 className="font-bold mb-1 text-lg">۳. وسایلی که می‌خواهی داخل خونه قرار بگیره</h2>
              <div className="flex items-center gap-2 mb-3">
                <Info size={13} className="text-accent shrink-0" />
                <p className="text-xs text-muted-foreground">
                  می‌توانی همزمان هر تعداد وسیله از هر دسته انتخاب کنی —
                  مبل + لوستر + فرش + هر چیز دیگری — جمینی همه را با هم چیدمان می‌کند.
                </p>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORIES.map((c) => {
                  const count = (products[c.slug] || []).length;
                  const sel   = selectedList.filter((p) => p.category_id === catMap[c.slug]).length;
                  return (
                    <button key={c.slug} onClick={() => setActiveCat(c.slug)}
                      className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 transition-all ${
                        activeCat === c.slug
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-accent/50"
                      }`}>
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                      <span className="text-xs opacity-70">({count})</span>
                      {sel > 0 && (
                        <span className="text-xs bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 font-bold">
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
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
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

            {/* ── RESULTS ─────────────────────────────────────────────────── */}
            {geminiResult && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">نتیجه چیدمان</h3>

                {/* Empty / fallback state — AI produced no valid, in-catalog placements.
                    The UI must never crash or show a blank overlay silently; this makes
                    the degraded state explicit to the user. */}
                {geminiResult.placements.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <span>
                      {geminiResult.consultation ||
                        "هوش مصنوعی نتوانست چیدمان مناسبی از میان محصولات انتخابی پیشنهاد دهد. می‌توانید دوباره تلاش کنید یا محصولات دیگری انتخاب کنید."}
                    </span>
                  </div>
                )}

                {/* Overlay — room image + product placements from Gemini */}
                {geminiResult.placements.length > 0 && (
                  <ProductOverlay
                    roomImage={imageBase64!}
                    placements={geminiResult.placements}
                    productsMap={selectedMap}
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
                        <span className="text-xs text-muted-foreground">جمع پیشنهادی جمینی:</span>
                        {/* total_price is always recomputed server-side from Supabase product
                            prices — the AI never supplies pricing data. */}
                        <span className="text-sm font-bold text-accent">{fmt(geminiResult.total_price)}</span>
                      </div>
                    </div>
                  )}

                  {/* Placements panel — product identity/price/image come ONLY from the
                      DB-backed selectedMap (never from the AI); the AI only ever
                      contributed product_id + normalized x/y/scale. */}
                  {analyticsTab === "placements" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                      {geminiResult.placements.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">هیچ وسیله‌ای جایگذاری نشد.</p>
                      ) : geminiResult.placements.map((pl) => {
                        const product = selectedMap[pl.product_id];
                        if (!product) return null;
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
