import { useState, useRef, useEffect, useMemo } from "react";
import { Upload, Wand2, Loader2, Download, ArrowLeft, Sparkles, RefreshCw, Check, ShoppingCart, X, ShoppingBag, Lightbulb } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

const PROGRESS_MESSAGES = [
  "در حال تحلیل ابعاد اتاق...",
  "بررسی نورپردازی و زوایا...",
  "چیدمان هوشمند محصولات...",
  "اعمال سبک دکوراسیون...",
  "بهینه‌سازی نهایی تصویر...",
];

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

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

const AIDesign = () => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [style, setStyle] = useState("modern");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [roomTip, setRoomTip] = useState<string | null>(null);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].slug);
  const [catMap, setCatMap] = useState<Record<string, string>>({}); // slug -> id
  const [products, setProducts] = useState<Record<string, Product[]>>({}); // slug -> products
  const [selected, setSelected] = useState<Record<string, Product>>({}); // productId -> product
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItem, setOpen: setOpenCart } = useCart();
  const navigate = useNavigate();

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

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("لطفاً یک تصویر انتخاب کنید");
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setResultImage(null);
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
    if (selectedList.length === 0) return;
    
    // check if all products are from the same seller
    const profileIds = new Set(selectedList.map(p => p.profile_id));
    if (profileIds.size > 1) {
      toast.error("در حال حاضر فقط امکان خرید محصولات از یک فروشگاه به صورت همزمان وجود دارد.");
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

  const generate = async () => {
    if (!imageBase64) return toast.error("ابتدا یک عکس از فضای خانه آپلود کنید");
    setLoading(true);
    setResultImage(null);
    setRoomTip(null);
    setProgressIndex(0);
    
    const progressInterval = setInterval(() => {
      setProgressIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 5000);

    try {
      const payloadProducts = selectedList.map((p) => {
        const slug = Object.keys(catMap).find((s) => catMap[s] === p.category_id);
        const cat = CATEGORIES.find((c) => c.slug === slug)?.label;
        return { name: p.name, category: cat, imageUrl: p.image_url || undefined, price: p.price ?? undefined };
      });
      const { data, error } = await supabase.functions.invoke<{ image?: string; tip?: string; error?: string }>("ai-redesign", {
        body: {
          imageBase64,
          style,
          prompt: prompt.trim(),
          products: payloadProducts,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const img = data?.image;
      if (!img) throw new Error("تصویری دریافت نشد");
      
      setResultImage(img);
      if (data?.tip) setRoomTip(data.tip);
      
      // Store products that were used for "Buy the Look" post-generation
      setGeneratedProducts([...selectedList]);
      
      toast.success("طراحی جدید آماده شد");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "خطا در تولید طراحی");
    } finally {
      setLoading(false);
      clearInterval(progressInterval);
    }
  };

  const download = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `homeino-redesign-${Date.now()}.png`;
    a.click();
  };

  const currentProducts = products[activeCat] || [];

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

            {/* Step 3: Choose products by category */}
            <section>
              <h2 className="font-bold mb-3 text-lg">۳. وسایلی که می‌خوای داخل خونه قرار بگیره</h2>

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

            {/* Step 4: Optional prompt */}
            <section>
              <h2 className="font-bold mb-3 text-lg">۴. توضیحات تکمیلی (اختیاری)</h2>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="مثلاً: مبل سمت پنجره، فرش روشن، لوستر طلایی..."
                className="w-full bg-card border border-border rounded-xl p-4 text-sm min-h-[90px] outline-none focus:border-accent transition-colors resize-none" />
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
                  <button 
                    onClick={buyTheLook}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
                  >
                    <ShoppingBag size={16} /> خرید این چیدمان
                  </button>
                </div>
              )}
            </div>

            <button onClick={generate} disabled={loading || !imageBase64}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all">
              {loading ? (<><Loader2 className="animate-spin" size={20} /> در حال طراحی...</>) : (<><Wand2 size={20} /> تولید طراحی جدید</>)}
            </button>

            {/* Result */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">نتیجه طراحی</h3>
              <div className="relative bg-card border border-border rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px]">
                {loading && (
                  <div className="text-center p-8 z-10 bg-card/80 backdrop-blur-sm w-full h-full absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-accent mx-auto mb-4" size={48} />
                    <p className="text-lg font-bold text-foreground mb-2">{PROGRESS_MESSAGES[progressIndex]}</p>
                    <p className="text-sm text-muted-foreground">۱۵ تا ۴۰ ثانیه طول می‌کشد...</p>
                  </div>
                )}
                
                {resultImage && !loading ? (
                  <BeforeAfterSlider beforeImage={imageBase64!} afterImage={resultImage} />
                ) : !loading && (
                  <div className="text-center p-12">
                    <Wand2 className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <p className="text-muted-foreground">طراحی جدید پس از کلیک بر روی دکمه تولید، اینجا نمایش داده می‌شود</p>
                  </div>
                )}
              </div>

              {roomTip && (
                <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2">
                  <Lightbulb className="text-accent shrink-0" size={20} />
                  <div>
                    <div className="text-xs font-bold text-accent mb-1">تحلیل فضا:</div>
                    <p className="text-sm text-foreground leading-relaxed">{roomTip}</p>
                  </div>
                </div>
              )}

              {resultImage && !loading && (
                <div className="flex gap-3">
                  <button onClick={download} className="flex-1 bg-card border border-border hover:border-accent text-foreground py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Download size={18} /> دانلود تصویر
                  </button>
                  <button onClick={generate} className="flex-1 bg-accent text-accent-foreground py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-accent/90">
                    <RefreshCw size={18} /> طراحی مجدد
                  </button>
                </div>
              )}

              {/* Buy the Look - Post Generation */}
              {resultImage && !loading && generatedProducts.length > 0 && (
                <div className="mt-8 pt-8 border-t border-border">
                  <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                    <ShoppingBag className="text-accent" /> خرید وسایل استفاده شده در این طرح
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {generatedProducts.map((p) => (
                      <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden group">
                        <div className="aspect-square relative overflow-hidden">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />}
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
                            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <ShoppingCart size={14} /> افزودن به سبد خرید
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIDesign;
