import { useState, useRef } from "react";
import { Upload, Wand2, Sparkles, ShoppingCart, ArrowLeft, Sofa, Lightbulb, Layers, Bed, Flower2, Image as ImageIcon, Package, Blinds, Loader2, Download, RefreshCw, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  { icon: Flower2, label: "گلدان", slug: "plants" },
  { icon: ImageIcon, label: "تابلو", slug: "art" },
  { icon: Package, label: "دکور", slug: "wood-decor" },
  { icon: Bed, label: "تخت", slug: "bedding" },
];

const steps = [
  {
    icon: Upload,
    step: "۰۱",
    title: "عکس فضا را آپلود کن",
    desc: "تصویر خانه‌ات را بفرست تا AI آن را دقیق تحلیل کند",
  },
  {
    icon: Wand2,
    step: "۰۲",
    title: "AI فضا را می‌شناسد",
    desc: "ابعاد، نور، سبک و رنگ فضا شناسایی می‌شود",
  },
  {
    icon: Sparkles,
    step: "۰۳",
    title: "وسایل دلخواه انتخاب کن",
    desc: "مبل، فرش، لوستر — هر وسیله‌ای را در فضای خودت ببین",
  },
  {
    icon: ShoppingCart,
    step: "۰۴",
    title: "لیست خرید بگیر",
    desc: "قیمت کل، لینک‌ها و هماهنگی خرید — یک‌کلیکه",
  },
];

const AIDesignSection = () => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["carpet"]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک تصویر انتخاب کنید");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم تصویر باید کمتر از ۸ مگابایت باشد");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  };

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const categoryLabel = (slug: string) => furniture.find((f) => f.slug === slug)?.label || slug;

  const generate = async (suggested = false) => {
    if (!imageBase64) {
      toast.error("ابتدا یک عکس از فضای خانه آپلود کنید");
      return;
    }
    setLoading(true);
    setResultImage(null);
    type AiRedesignResponse = { image?: string; error?: string };

    try {
      const products = selectedCategories.map((slug) => ({
        name: categoryLabel(slug),
        category: slug,
      }));

      const promptText = suggested
        ? ""
        : `Only replace the following items in the room: ${selectedCategories.map(categoryLabel).join("، ")}. Keep all other furniture, decor, and architectural elements exactly as they are.`;

      const { data, error } = await supabase.functions.invoke("ai-redesign", {
        body: {
          imageBase64,
          style: selectedStyle,
          prompt: promptText,
          products,
        },
      });
      if (error) throw error;
      const result = data as AiRedesignResponse;
      if (result?.error) throw new Error(result.error);
      const img = result?.image;
      if (!img) throw new Error("تصویری دریافت نشد");
      setResultImage(img);
      toast.success("طراحی جدید آماده شد!");
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "خطا در تولید طراحی");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `homeino-redesign-${Date.now()}.png`;
    a.click();
  };

  const reset = () => {
    setResultImage(null);
    setImageBase64(null);
    setSelectedCategories(["carpet"]);
    setSelectedStyle("modern");
  };

  return (
    <section
      id="ai-design"
      className="py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(25 35% 12%) 0%, hsl(20 40% 8%) 100%)" }}
    >
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: "hsl(20 80% 50% / 0.08)" }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl" style={{ background: "hsl(30 90% 55% / 0.06)" }} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6" style={{ background: "hsl(20 80% 50% / 0.12)", border: "1px solid hsl(20 80% 50% / 0.25)" }}>
            <Sparkles size={16} style={{ color: "hsl(25 95% 60%)" }} />
            <span className="text-sm font-medium" style={{ color: "hsl(25 95% 65%)" }}>طراح هوشمند هومینو</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold" style={{ color: "hsl(40 30% 95%)" }}>
            خانه‌ات را با <span style={{ background: "linear-gradient(135deg, hsl(25 95% 60%), hsl(15 85% 55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>هوش مصنوعی</span> طراحی کن
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg" style={{ color: "hsl(40 20% 70%)" }}>
            پیشرفته‌ترین AI دکوراسیون — هر وسیله‌ای را در خانه‌ات امتحان کن، بعد تصمیم بگیر
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Interactive mockup */}
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "hsl(20 30% 10%)", border: "1px solid hsl(20 25% 18%)" }}>
            {/* Browser bar */}
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "hsl(20 30% 8%)", borderBottom: "1px solid hsl(20 25% 18%)" }}>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: "#27c93f" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f56" }} />
              </div>
              <span className="text-xs" style={{ color: "hsl(40 20% 65%)" }}>Homeino — AI Design Studio</span>
            </div>

            {/* Upload zone */}
            <div
              onClick={() => !loading && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className="relative aspect-[16/9] overflow-hidden cursor-pointer group"
            >
              {imageBase64 ? (
                <>
                  <img src={resultImage || imageBase64} alt="فضای طراحی شده" className="w-full h-full object-cover transition-all duration-500" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 60%, hsl(20 40% 8% / 0.5) 100%)" }} />
                  {/* Result pins */}
                  {resultImage && selectedCategories.map((slug) => (
                    <div key={slug} className="absolute flex flex-col items-center gap-1" style={{ top: `${40 + furniture.findIndex((f) => f.slug === slug) * 5}%`, right: `${50 + furniture.findIndex((f) => f.slug === slug) * 4}%` }}>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, hsl(25 95% 60%), hsl(15 85% 55%))" }}>
                        <Check size={14} className="text-white" />
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: "hsl(20 30% 10%)", color: "hsl(40 30% 95%)", border: "1px solid hsl(20 25% 22%)" }}>
                        {categoryLabel(slug)}
                      </span>
                    </div>
                  ))}
                  {/* Overlay on hover to change image */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "hsl(20 40% 8% / 0.6)" }}>
                    <div className="text-center">
                      <Upload size={28} className="mx-auto mb-2" style={{ color: "hsl(40 20% 80%)" }} />
                      <span className="text-sm font-medium" style={{ color: "hsl(40 30% 95%)" }}>تغییر تصویر</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full transition-all" style={{ background: dragging ? "hsl(20 80% 50% / 0.1)" : "transparent" }}>
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(20 80% 50% / 0.12)" }}>
                      <Upload size={28} style={{ color: "hsl(25 95% 60%)" }} />
                    </div>
                    <p className="font-bold text-lg mb-1" style={{ color: "hsl(40 30% 95%)" }}>عکس فضای خود را آپلود کنید</p>
                    <p className="text-sm" style={{ color: "hsl(40 20% 65%)" }}>کلیک کنید یا عکس را اینجا بکشید (JPG/PNG تا ۸ مگابایت)</p>
                  </div>
                </div>
              )}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: "hsl(20 40% 8% / 0.75)" }}>
                  <div className="text-center">
                    <Loader2 className="animate-spin mx-auto mb-3" size={40} style={{ color: "hsl(25 95% 60%)" }} />
                    <p className="font-bold" style={{ color: "hsl(40 30% 95%)" }}>هوش مصنوعی در حال طراحی...</p>
                    <p className="text-sm mt-1" style={{ color: "hsl(40 20% 65%)" }}>۱۵ تا ۴۰ ثانیه طول می‌کشد</p>
                  </div>
                </div>
              )}
            </div>

            {/* Style picker */}
            <div className="px-5 pt-4">
              <div className="text-xs mb-3 tracking-widest" style={{ color: "hsl(40 20% 55%)" }}>SELECT STYLE</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStyle(s.id); setResultImage(null); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={
                      selectedStyle === s.id
                        ? { background: "hsl(20 80% 50% / 0.15)", border: "1px solid hsl(25 95% 60%)", color: "hsl(40 30% 95%)" }
                        : { background: "hsl(20 25% 13%)", border: "1px solid hsl(20 25% 18%)", color: "hsl(40 20% 70%)" }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Furniture grid — now interactive */}
            <div className="p-5 pt-0">
              <div className="text-xs mb-3 tracking-widest" style={{ color: "hsl(40 20% 55%)" }}>SELECT ITEMS TO REPLACE</div>
              <div className="grid grid-cols-4 gap-2">
                {furniture.map((f) => {
                  const Icon = f.icon;
                  const isActive = selectedCategories.includes(f.slug);
                  return (
                    <button
                      key={f.label}
                      onClick={() => toggleCategory(f.slug)}
                      className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all"
                      style={
                        isActive
                          ? { background: "hsl(20 80% 50% / 0.15)", border: "1px solid hsl(25 95% 60%)" }
                          : { background: "hsl(20 25% 13%)", border: "1px solid hsl(20 25% 18%)" }
                      }
                    >
                      <Icon size={20} style={{ color: isActive ? "hsl(25 95% 65%)" : "hsl(40 20% 60%)" }} />
                      <span className="text-xs" style={{ color: isActive ? "hsl(40 30% 95%)" : "hsl(40 20% 70%)" }}>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => generate(false)}
                  disabled={loading || !imageBase64}
                  className="w-full py-3 font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, hsl(25 95% 55%), hsl(15 85% 50%))" }}
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={18} /> در حال طراحی...</>
                  ) : (
                    <><Wand2 size={18} /> جایگزینی انتخابی</>
                  )}
                </button>
                <button
                  onClick={() => generate(true)}
                  disabled={loading || !imageBase64}
                  className="w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "hsl(20 25% 13%)", border: "1px solid hsl(20 25% 18%)", color: "hsl(25 95% 65%)" }}
                >
                  <Sparkles size={18} />
                  طراحی پیشنهادی هوش مصنوعی
                </button>
              </div>

              {/* Download & Reset after generation */}
              {resultImage && !loading && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={download}
                    className="flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    style={{ background: "hsl(20 30% 11%)", border: "1px solid hsl(20 25% 18%)", color: "hsl(40 20% 80%)" }}
                  >
                    <Download size={16} /> دانلود
                  </button>
                  <button
                    onClick={reset}
                    className="flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    style={{ background: "hsl(20 30% 11%)", border: "1px solid hsl(20 25% 18%)", color: "hsl(40 20% 80%)" }}
                  >
                    <RefreshCw size={16} /> ریست
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="flex items-center gap-4 p-5 rounded-2xl transition-all hover:translate-x-[-4px]"
                  style={{ background: "hsl(20 30% 11%)", border: "1px solid hsl(20 25% 18%)" }}
                >
                  <span className="text-sm font-bold" style={{ color: "hsl(40 20% 50%)" }}>{s.step}</span>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, hsl(25 95% 55%), hsl(15 85% 50%))" }}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-bold text-base mb-1" style={{ color: "hsl(40 30% 95%)" }}>{s.title}</h3>
                    <p className="text-sm" style={{ color: "hsl(40 20% 65%)" }}>{s.desc}</p>
                  </div>
                </div>
              );
            })}

            <Link
              to="/ai-design"
              className="mt-4 w-full text-white px-8 py-4 rounded-2xl font-bold text-lg inline-flex items-center justify-center gap-3 shadow-xl transition-all hover:opacity-95"
              style={{ background: "linear-gradient(135deg, hsl(25 95% 55%), hsl(15 85% 50%))" }}
            >
              <Sparkles size={20} />
              همین الان طراحی کن
              <ArrowLeft size={20} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIDesignSection;