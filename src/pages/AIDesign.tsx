import { useState, useRef } from "react";
import { Upload, Wand2, Loader2, Download, ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const STYLES = [
  { id: "modern", label: "مدرن", desc: "خطوط ساده، رنگ‌های خنثی" },
  { id: "classic", label: "کلاسیک", desc: "اشرافی، چوبی، طلایی" },
  { id: "minimalist", label: "مینیمال", desc: "ساده، روشن، خلوت" },
  { id: "industrial", label: "صنعتی", desc: "بتن، فلز، چوب خام" },
  { id: "scandinavian", label: "اسکاندیناوی", desc: "روشن، چوب طبیعی" },
  { id: "luxury", label: "لوکس", desc: "مخمل، طلا، مرمر" },
  { id: "bohemian", label: "بوهمی", desc: "رنگارنگ، گیاهان، بافت" },
  { id: "japanese", label: "ژاپنی", desc: "زن، چوب، خطوط نرم" },
];

const AIDesign = () => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [style, setStyle] = useState("modern");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
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

  const generate = async () => {
    if (!imageBase64) {
      toast.error("ابتدا یک تصویر آپلود کنید");
      return;
    }
    setLoading(true);
    setResultImage(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-redesign", {
        body: {
          imageBase64,
          style,
          prompt: prompt.trim() || "بازطراحی کامل و حرفه‌ای فضا",
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const img = (data as any)?.image;
      if (!img) throw new Error("تصویری دریافت نشد");
      setResultImage(img);
      toast.success("طراحی جدید آماده شد");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "خطا در تولید طراحی");
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
            عکس فضای خود را آپلود کنید، سبک دلخواه را انتخاب کنید و چیدمان جدید را در چند ثانیه ببینید.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input column */}
          <div className="space-y-6">
            <div>
              <h2 className="font-bold mb-3 text-lg">۱. عکس فضا را آپلود کنید</h2>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className="relative cursor-pointer border-2 border-dashed border-border rounded-2xl aspect-video flex items-center justify-center bg-card hover:border-accent transition-colors overflow-hidden"
              >
                {imageBase64 ? (
                  <img src={imageBase64} alt="فضای آپلود شده" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <Upload className="mx-auto mb-3 text-muted-foreground" size={36} />
                    <p className="text-sm text-muted-foreground">برای آپلود کلیک کنید یا عکس را اینجا بکشید</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">JPG/PNG تا ۸ مگابایت</p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            </div>

            <div>
              <h2 className="font-bold mb-3 text-lg">۲. سبک دکوراسیون</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      style === s.id
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-card hover:border-accent/50"
                    }`}
                  >
                    <div className="font-bold text-sm">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-bold mb-3 text-lg">۳. توضیحات تکمیلی (اختیاری)</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="مثلاً: یک مبل سبز مخمل، فرش طرح‌دار، لوستر طلایی، گیاه آپارتمانی..."
                className="w-full bg-card border border-border rounded-xl p-4 text-sm min-h-[100px] outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            <button
              onClick={generate}
              disabled={loading || !imageBase64}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  در حال طراحی...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  تولید طراحی جدید
                </>
              )}
            </button>
          </div>

          {/* Output column */}
          <div>
            <h2 className="font-bold mb-3 text-lg">نتیجه</h2>
            <div className="relative bg-card border border-border rounded-2xl aspect-video overflow-hidden flex items-center justify-center">
              {loading && (
                <div className="text-center">
                  <Loader2 className="animate-spin text-accent mx-auto mb-3" size={40} />
                  <p className="text-sm text-muted-foreground">هوش مصنوعی در حال خلق طراحی شماست...</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">معمولاً ۱۵ تا ۴۰ ثانیه طول می‌کشد</p>
                </div>
              )}
              {!loading && resultImage && (
                <img src={resultImage} alt="طراحی جدید" className="w-full h-full object-cover" />
              )}
              {!loading && !resultImage && (
                <div className="text-center p-6">
                  <Wand2 className="mx-auto mb-3 text-muted-foreground" size={36} />
                  <p className="text-sm text-muted-foreground">طراحی جدید اینجا نمایش داده می‌شود</p>
                </div>
              )}
            </div>

            {resultImage && !loading && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={download}
                  className="flex-1 bg-card border border-border hover:border-accent text-foreground py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Download size={18} />
                  دانلود تصویر
                </button>
                <button
                  onClick={generate}
                  className="flex-1 bg-card border border-border hover:border-accent text-foreground py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw size={18} />
                  طراحی مجدد
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIDesign;
