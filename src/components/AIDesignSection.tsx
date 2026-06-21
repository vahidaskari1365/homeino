import { useState, useRef, useEffect } from "react";
import { Upload, Wand as Wand2, Sparkles, ShoppingCart, ArrowLeft, Sofa, Lightbulb, Layers, Bed, Flower2, Image as ImageIcon, Package, Blinds, Loader as Loader2, Download, RefreshCw, Check, ShoppingBag, CircleDot, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { useCart } from "@/contexts/CartContext";
import { redesignRoom } from "@/services/huggingface";

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
];

const furniture = [
  { icon: Blinds, label: "پرده", slug: "curtain" },
  { icon: Lightbulb, label: "لوستر", slug: "lighting" },
  { icon: Layers, label: "فرش", slug: "carpet" },
  { icon: Sofa, label: "مبل راحتی", slug: "furniture" },
  { icon: CircleDot, label: "میز ناهارخوری", slug: "dining-table" },
  { icon: Flower2, label: "گلدان", slug: "plants" },
  { icon: ImageIcon, label: "تابلو", slug: "art" },
  { icon: Package, label: "دکور", slug: "wood-decor" },
  { icon: Bed, label: "تخت", slug: "bedding" },
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

const steps = [
  {
    icon: Upload,
    step: "۰۱",
    title: "عکس فضا را آپلود کن",
    desc: "تصویر خانه‌ات را بفرست تا هوش مصنوعی ابعاد آن را دقیق تحلیل کند",
  },
  {
    icon: Wand2,
    step: "۰۲",
    title: "AI فضا را می‌شناسد",
    desc: "نور، سبک، دیوارها، درب‌ها و کدهای رنگی اتاق شناسایی می‌شود",
  },
  {
    icon: Sparkles,
    step: "۰۳",
    title: "وسایل دلخواه انتخاب کن",
    desc: "لوستر، مبل و دکوراسیون دلخواه خود را روی طرح پیاده‌سازی کن",
  },
  {
    icon: ShoppingCart,
    step: "۰۴",
    title: "لیست قیمت هوشمند بگیر",
    desc: "برآورد آنی قیمت کالاها و خرید فاکتور چیده شده با یک کلیک",
  },
];

const AIDesignSection = () => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["carpet"]);
  const [loading, setLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [roomTip, setRoomTip] = useState<string | null>(null);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItem } = useCart();

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک تصویر انتخاب کنید");
      return;
    }

    const compressImage = (img: HTMLImageElement): string => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      return canvas.toDataURL("image/jpeg", 0.8);
    };

    const img = new Image();
    img.onload = () => {
      const compressed = compressImage(img);
      if (compressed) {
        setImageBase64(compressed);
        setResultImage(null);
        toast.success("تصویر با موفقیت بارگذاری شد");
      } else {
        toast.error("خطا در پردازش تصویر");
      }
    };
    img.onerror = () => {
      toast.error("خطا در بارگذاری تصویر");
    };

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const runDesign = async () => {
    if (!imageBase64) {
      toast.error("ابتدا تصویر فضا را بارگذاری کنید");
      return;
    }

    setLoading(true);
    setProgressIndex(0);
    setGeneratedProducts([]);

    const interval = setInterval(() => {
      setProgressIndex((prev) => {
        if (prev < PROGRESS_MESSAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 2500);

    try {
      const categoryLabel = (slug: string) => furniture.find((f) => f.slug === slug)?.label || slug;
      
      const productsPayload = selectedCategories.map((slug) => ({
        name: categoryLabel(slug),
        category: slug,
      }));

      const promptText = `Only replace the following items in the room: ${selectedCategories.map(categoryLabel).join("، ")}. Keep all other furniture, decor, and architectural elements exactly as they are.`;

      const result = await redesignRoom(
        imageBase64,
        selectedStyle,
        promptText,
        productsPayload
      );

      clearInterval(interval);

      if (result.error) {
        throw new Error(result.error);
      }

      const img = result.image;
      if (!img) throw new Error("تصویری دریافت نشد");

      setResultImage(img);
      if (result.tip) setRoomTip(result.tip);

      // Fetch matched products for shopping list based on categories
      const { data: cats } = await supabase.from("producer_categories").select("id, slug").in("slug", selectedCategories);
      if (cats && cats.length > 0) {
        const catIds = cats.map(c => c.id);
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, image_url, category_id, profile_id, stock")
          .in("category_id", catIds)
          .eq("is_active", true)
          .not("image_url", "is", null)
          .limit(4);
        if (prods) setGeneratedProducts(prods as Product[]);
      }

      toast.success("طراحی دکوراسیون با موفقیت انجام شد!");
    } catch (e: any) {
      clearInterval(interval);
      console.error(e);
      toast.error(e.message || "خطا در برقراری ارتباط با هوش مصنوعی");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResultImage(null);
    setImageBase64(null);
    setSelectedCategories(["carpet"]);
    setSelectedStyle("modern");
  };

  const download = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `homeino-ai-${selectedStyle}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Add all itemized products in shopping list to cart
  const addAllToCart = () => {
    if (generatedProducts.length === 0) return;
    generatedProducts.forEach((p) => {
      addItem({
        product_id: p.id,
        profile_id: p.profile_id || "",
        name: p.name,
        price: p.price || 0,
        image_url: p.image_url,
        stock: p.stock || 10,
      });
    });
    toast.success("تمام کالاهای دکوراسیون با موفقیت به سبد خرید اضافه شدند!");
  };

  // Calculate total price of design items
  const totalCost = generatedProducts.reduce((sum, p) => sum + (p.price || 0), 0);

  return (
    <section
      id="ai-design"
      className="py-24 relative overflow-hidden bg-stone-950 border-y border-emerald-950/20"
      style={{ background: "linear-gradient(135deg, #091a12 0%, #030805 100%)" }}
    >
      {/* Luxurious glowing high-performance composite background elements */}
      <div className="absolute top-12 right-12 w-[450px] h-[450px] rounded-full blur-[130px] bg-emerald-500/10 pointer-events-none animate-float" />
      <div className="absolute bottom-12 left-12 w-[400px] h-[400px] rounded-full blur-[130px] bg-teal-500/10 pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[250px] rounded-full blur-[140px] bg-amber-500/5 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6 bg-emerald-950/40 border border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Sparkles size={16} className="text-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-300">طراح هوشمند هومینو</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-stone-100 tracking-tight">
            خانه‌ات را با <span style={{ background: "linear-gradient(135deg, #10b981, #059669)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>هوش مصنوعی</span> طراحی کن
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-stone-400">
            پیشرفته‌ترین دکوراتور هوش مصنوعی — هر دکور، فرش، مبلمان یا پرده را در فضا شبیه‌سازی کنید
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Main workspace (image uploader & generated result) */}
          <div className="lg:col-span-2 rounded-[2rem] p-6 border border-white/5 bg-stone-900/40 backdrop-blur-2xl shadow-luxury relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden relative" style={{ background: "#050d09" }}>
              {loading && (
                <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-5 text-white p-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
                  </div>
                  <div className="text-center">
                    <div className="font-black text-lg mb-2 text-emerald-300 animate-pulse">
                      {PROGRESS_MESSAGES[progressIndex]}
                    </div>
                    <div className="text-xs text-stone-400">هوش مصنوعی در حال چیدمان بهینه قطعات است</div>
                  </div>
                </div>
              )}

              {!imageBase64 && !resultImage && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                  className={`absolute inset-0 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all ${
                    dragging ? "border-emerald-500 bg-emerald-500/10" : "border-stone-800 hover:border-emerald-500/40 bg-stone-950/40"
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <Upload size={24} />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">بارگذاری تصویر اتاق</h3>
                  <p className="text-xs text-stone-400 text-center max-w-sm mb-4">
                    عکس سالن پذیرایی، آشپزخانه یا اتاق خواب را بکشید و رها کنید یا فایل را انتخاب کنید
                  </p>
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    انتخاب فایل عکس
                  </button>
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                </div>
              )}

              {imageBase64 && !resultImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src={imageBase64} alt="Original Workspace" className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button onClick={runDesign} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-lg transition-transform hover:scale-103">
                      <Sparkles size={16} /> شروع طراحی دکور
                    </button>
                    <button onClick={reset} className="px-4 py-3 bg-stone-900/80 hover:bg-stone-900 text-white font-bold rounded-xl text-sm backdrop-blur-md transition-colors">
                      حذف عکس
                    </button>
                  </div>
                </div>
              )}

              {resultImage && (
                <div className="absolute inset-0">
                  <BeforeAfterSlider before={imageBase64 || ""} after={resultImage} />
                </div>
              )}
            </div>

            {roomTip && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">توصیه طراح هوش مصنوعی هومینو</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed text-right" style={{ direction: "rtl" }}>{roomTip}</p>
              </div>
            )}

            {/* Design styles and filters picker */}
            <div className="mt-6 flex flex-col sm:flex-row gap-5">
              <div className="flex-1">
                <div className="text-xs font-bold text-stone-400 mb-3 tracking-widest text-right">سبک دکوراسیون (STYLE)</div>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStyle(s.id); setResultImage(null); }}
                      className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all hover:scale-[1.03] ${
                        selectedStyle === s.id
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                          : "bg-stone-900/60 border-stone-800 text-stone-400 hover:border-emerald-500/20"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <div className="text-xs font-bold text-stone-400 mb-3 tracking-widest text-right">وسایل مورد استفاده (ITEMS TO USE)</div>
                <div className="flex flex-wrap gap-2">
                  {furniture.map((f) => {
                    const Icon = f.icon;
                    const isActive = selectedCategories.includes(f.slug);
                    return (
                      <button
                        key={f.label}
                        onClick={() => toggleCategory(f.slug)}
                        className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold border flex items-center gap-2 transition-all hover:scale-[1.03] ${
                          isActive
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                            : "bg-stone-900/40 border-stone-850 text-stone-500 hover:border-emerald-500/20"
                        }`}
                      >
                        <Icon size={18} className={isActive ? "text-emerald-400" : "text-stone-500"} />
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {resultImage && !loading && (
              <div className="mt-5 pt-5 border-t border-stone-800/80 flex gap-3">
                <button onClick={download} className="flex-1 py-3 rounded-xl bg-stone-900 hover:bg-stone-850 text-white font-bold text-sm flex items-center justify-center gap-2 border border-stone-800 transition-colors">
                  <Download size={16} /> دانلود عکس طراح
                </button>
                <button onClick={reset} className="flex-1 py-3 rounded-xl bg-stone-900 hover:bg-stone-850 text-white font-bold text-sm flex items-center justify-center gap-2 border border-stone-800 transition-colors">
                  <RefreshCw size={16} /> طراحی جدید
                </button>
              </div>
            )}
          </div>

          {/* Side panel: Steps / Shopping List & PRICE ESTIMATOR */}
          <div className="space-y-6">
            {/* dynamic shopping list and cost estimator if design is ready */}
            {resultImage && !loading && generatedProducts.length > 0 ? (
              <div className="rounded-[2rem] p-5 border border-emerald-500/15 bg-[#071610] backdrop-blur-2xl shadow-luxury flex flex-col gap-5">
                <div className="flex items-center gap-2 pb-3 border-b border-emerald-950">
                  <Receipt size={18} className="text-emerald-400" />
                  <h3 className="text-base font-black text-white">برآورد قیمت دکوراسیون چیده شده</h3>
                </div>

                {/* Items and prices */}
                <div className="flex flex-col gap-3">
                  {generatedProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950/40 border border-emerald-950/40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/5">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{p.name}</h4>
                          <span className="text-[10px] text-stone-500">هماهنگ شده با طرح</span>
                        </div>
                      </div>
                      <div className="text-xs font-black text-emerald-400">{fmt(p.price)}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-emerald-950 pt-4 flex flex-col gap-1.5 text-right">
                  <span className="text-[10px] font-bold text-stone-500 tracking-wider">PROJECT ESTIMATED COST</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-stone-400 font-bold">قیمت کل طرح پیشنهادی:</span>
                    <span className="text-lg font-black text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                      {fmt(totalCost)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={addAllToCart}
                  className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-102"
                >
                  <ShoppingBag size={18} />
                  افزودن کل محصولات طرح به سبد
                </button>
              </div>
            ) : (
              /* Steps layout (normal/pre-generation state) - redesigned to glowing custom cards */
              <div className="space-y-4">
                {steps.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.step}
                      className="flex items-center gap-4 p-5 rounded-2xl border border-emerald-950/20 bg-emerald-950/5 hover:bg-emerald-950/15 backdrop-blur-xl transition-all duration-300 hover:translate-x-[-5px] hover:border-emerald-500/15 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] group"
                    >
                      <span className="text-sm font-bold text-emerald-500/40 group-hover:text-emerald-400 transition-colors">{s.step}</span>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/20 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.06)] group-hover:from-emerald-400 group-hover:to-emerald-600 group-hover:text-stone-950 group-hover:scale-105 transition-all duration-500">
                        <Icon size={20} className="text-emerald-400 group-hover:text-stone-950 transition-colors" />
                      </div>
                      <div className="flex-1 text-right">
                        <h3 className="font-bold text-base mb-0.5 text-stone-200 group-hover:text-white transition-colors">
                          {s.title}
                        </h3>
                        <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 w-full px-8 py-4 rounded-2xl font-bold text-lg inline-flex items-center justify-center gap-3 transition-all bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-lg hover:scale-102"
                >
                  <Sparkles size={20} className="animate-pulse" />
                  همین الان شروع کنید
                  <ArrowLeft size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIDesignSection;
