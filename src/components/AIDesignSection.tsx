import { Upload, Wand2, Sparkles, ShoppingCart, ArrowLeft, Sofa, Lightbulb, Layers, Bed, Flower2, Image as ImageIcon, Package, Blinds } from "lucide-react";
import { Link } from "react-router-dom";
import roomImage from "@/assets/hero-living.jpg";

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

const furniture = [
  { icon: Blinds, label: "پرده" },
  { icon: Lightbulb, label: "لوستر" },
  { icon: Layers, label: "فرش", active: true },
  { icon: Sofa, label: "مبل راحتی" },
  { icon: Flower2, label: "گلدان" },
  { icon: ImageIcon, label: "تابلو" },
  { icon: Package, label: "دکور" },
  { icon: Bed, label: "تخت" },
];

const AIDesignSection = () => {
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

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Mockup */}
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

            {/* Room image with tags */}
            <div className="relative aspect-[16/9] overflow-hidden">
              <img src={roomImage} alt="فضای طراحی شده" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 60%, hsl(20 40% 8% / 0.5) 100%)" }} />
              {/* Pins */}
              {[
                { label: "مبل", top: "55%", right: "70%" },
                { label: "فرش", top: "72%", right: "50%" },
                { label: "لوستر", top: "28%", right: "38%" },
              ].map((p) => (
                <div key={p.label} className="absolute flex flex-col items-center gap-1" style={{ top: p.top, right: p.right }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, hsl(25 95% 60%), hsl(15 85% 55%))" }}>
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: "hsl(20 30% 10%)", color: "hsl(40 30% 95%)", border: "1px solid hsl(20 25% 22%)" }}>{p.label}</span>
                </div>
              ))}
            </div>

            {/* Furniture grid */}
            <div className="p-5">
              <div className="text-xs mb-3 tracking-widest" style={{ color: "hsl(40 20% 55%)" }}>SELECT FURNITURE</div>
              <div className="grid grid-cols-4 gap-2">
                {furniture.map((f) => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.label}
                      className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all"
                      style={
                        f.active
                          ? { background: "hsl(20 80% 50% / 0.15)", border: "1px solid hsl(25 95% 60%)" }
                          : { background: "hsl(20 25% 13%)", border: "1px solid hsl(20 25% 18%)" }
                      }
                    >
                      <Icon size={20} style={{ color: f.active ? "hsl(25 95% 65%)" : "hsl(40 20% 60%)" }} />
                      <span className="text-xs" style={{ color: f.active ? "hsl(40 30% 95%)" : "hsl(40 20% 70%)" }}>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Total */}
              <div className="mt-4 rounded-xl overflow-hidden" style={{ background: "hsl(20 25% 13%)", border: "1px solid hsl(20 25% 18%)" }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm" style={{ color: "hsl(40 20% 70%)" }}>مجموع:</span>
                  <span className="font-bold" style={{ color: "hsl(25 95% 65%)" }}>۸۵٬۰۰۰٬۰۰۰ تومان</span>
                </div>
                <button className="w-full py-3 font-bold text-white" style={{ background: "linear-gradient(135deg, hsl(25 95% 55%), hsl(15 85% 50%))" }}>
                  دریافت لیست خرید
                </button>
              </div>
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
