import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, ArrowLeft } from "lucide-react";
import sceneLiving from "@/assets/hero-cinematic-living.jpg";
import sceneBedroom from "@/assets/hero-cinematic-bedroom.jpg";
import sceneKitchen from "@/assets/hero-cinematic-kitchen.jpg";

const QUICK_TAGS = ["مبلمان", "فرش و قالی", "لوستر", "پرده", "دکور چوبی"];

const SCENES = [
  { src: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2000&q=80", label: "نمای بیرونی ویلا", caption: "معماری مدرن و با شکوه" },
  { src: sceneLiving, label: "نشیمن مدرن", caption: "نور طلایی غروب" },
  { src: sceneBedroom, label: "اتاق خواب آرام", caption: "صبح‌های روشن" },
  { src: sceneKitchen, label: "آشپزخانه طراحی‌شده", caption: "گرمای دلنشین" },
];

const HeroSection = () => {
  const [activeScene, setActiveScene] = useState(0);

  // Autoplay timed slideshow transition (runs fully in background)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScene((prev) => (prev + 1) % SCENES.length);
    }, 5000); // Transitions every 5 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Cinematic Autoplay Background Layers */}
      <div className="absolute inset-0 z-0">
        {SCENES.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-all ease-in-out ${
              activeScene === i ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-105 blur-[2px]"
            }`}
            style={{ transitionDuration: '1500ms' }}
          >
            <img src={s.src} alt={s.label} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Cinematic grade overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-background z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient(ellipse at center, transparent 40%, black/20 100%) z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-black/15 z-10 pointer-events-none" />

      {/* Caption chip (top-right in RTL) */}
      <div className="absolute top-28 right-6 sm:right-12 z-20 flex flex-col items-end gap-2 pointer-events-none">
        {SCENES.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900/60 backdrop-blur-md border border-white/10 transition-all duration-700 ${
              activeScene === i ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
            style={{ position: activeScene === i ? "relative" : "absolute" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-white/90 text-xs sm:text-sm font-semibold">{s.label}</span>
            <span className="text-white/45 text-[11px] hidden sm:inline">· {s.caption}</span>
          </div>
        ))}
      </div>

      {/* Foreground Content */}
      <div className="relative z-20 container mx-auto px-6 sm:px-10 flex items-center justify-center h-full">
        <div className="max-w-5xl text-center flex flex-col items-center justify-center">
          {/* Kicker */}
          <div className="inline-flex items-center justify-center gap-3 mb-6 bg-stone-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
            <span className="h-px w-10 bg-primary/70" />
            <span className="text-primary text-xs sm:text-sm font-semibold uppercase tracking-wider">
              مرجع تخصصی دکوراسیون و طراحی داخلی
            </span>
            <span className="h-px w-10 bg-primary/70" />
          </div>

          {/* Strictly single-line centered oversized 3D headline */}
          <h1 className="w-full text-center py-2 select-none pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
            <span className="block text-[clamp(1.5rem,5.2vw,4.8rem)] leading-none font-black text-3d-luxury whitespace-nowrap">
              خانه رؤیایی‌تان را طراحی کنید
            </span>
          </h1>

          <div className="h-[3px] w-48 bg-primary mt-6 mx-auto rounded-full" />

          {/* Subhead */}
          <p className="mt-7 text-base sm:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            از الهام گرفتن تا خرید، از طراحی با هومینو استودیو تا تجهیز کامل خانه — همه چیز در یک پلتفرم.
          </p>

          {/* Search bar */}
          <div className="mt-10 w-full max-w-2xl mx-auto">
            <div className="flex items-center bg-stone-900/60 backdrop-blur-xl border border-white/10 rounded-full overflow-hidden shadow-2xl transition-all duration-300 hover:border-primary/50 focus-within:border-primary/60">
              <input
                type="text"
                aria-label="جستجوی کالا یا سبک دکوراسیون"
                placeholder="نام کالا یا سبک دکوراسیون مورد نظر خود را جستجو کنید..."
                className="flex-1 bg-transparent text-white placeholder:text-white/45 px-7 py-5 text-base outline-none text-right"
                style={{ direction: "rtl" }}
              />
              <button
                aria-label="جستجو"
                className="bg-primary text-primary-foreground m-1.5 px-7 py-3.5 rounded-full flex items-center gap-2 font-bold hover:opacity-90 transition-opacity shrink-0"
              >
                <Search size={20} />
                <span className="hidden sm:inline">جستجو</span>
              </button>
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap justify-center gap-2.5 mt-5">
              {QUICK_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 rounded-full border border-white/10 bg-stone-900/35 backdrop-blur-sm text-white/70 text-sm hover:border-primary/50 hover:text-primary cursor-pointer transition-all duration-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 w-full">
            <Link
              to="/ai-design"
              className="group bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.03] transition-transform shadow-lg"
            >
              <Sparkles size={20} />
              طراحی رایگان با هومینو استودیو
            </Link>
            <a
              href="#complete-sets"
              className="group text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 border border-white/25 hover:border-primary/60 hover:text-primary transition-colors backdrop-blur-sm bg-stone-900/10"
            >
              ست‌های آماده دکوراسیون
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
