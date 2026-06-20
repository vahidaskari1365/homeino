import { useEffect, useRef } from "react";
import { Search, Sparkles, ShoppingBag } from "lucide-react";
import heroImg from "@/assets/hero-living.jpg";
import OptimizedImage from "./OptimizedImage";

const HeroSection = () => {
  const parallaxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let raf = 0;
    const update = () => {
      const offset = Math.min(window.scrollY, window.innerHeight);
      // gentle downward drift + subtle zoom for a cinematic feel
      el.style.transform = `translate3d(0, ${offset * 0.25}px, 0) scale(${1 + offset * 0.0002})`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image (parallax) */}
      <div ref={parallaxRef} className="absolute inset-0 parallax-bg">
        <OptimizedImage
          src={heroImg}
          alt="دکوراسیون لوکس"
          className="w-full h-full object-cover scale-110"
          width={1920}
          height={1080}
          lazy={false}
        />
        <div className="absolute inset-0 gradient-hero hero-glow" />
        <div className="absolute inset-0 bg-charcoal/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/30 rounded-full px-5 py-2 mb-8">
            <Sparkles size={16} className="text-gold" />
            <span className="text-gold text-sm font-medium">مرجع تخصصی دکوراسیون و لوازم خانه</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            خانه رویایی‌تان را
            <br />
            <span className="text-gold">طراحی کنید</span>
          </h1>

          <p className="text-lg md:text-xl text-white/75 mb-6 max-w-2xl mx-auto leading-relaxed">
            از الهام گرفتن تا خرید، از طراحی با هوش مصنوعی تا تجهیز کامل خانه.
            همه چیز در یک پلتفرم.
          </p>

          {/* Badges removed */}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a
              href="#ai-design"
              className="gradient-gold text-charcoal px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:scale-105 shadow-luxury"
            >
              <Sparkles size={20} />
              طراحی رایگان با AI
            </a>
            <a
              href="#complete-sets"
              className="bg-white/10 backdrop-blur-xl border border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
            >
              <ShoppingBag size={20} />
              ست‌های آماده دکوراسیون
            </a>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-luxury transition-all duration-300 hover:border-gold/40">
              <input
                type="text"
                placeholder="نام کالا یا سبک دکوراسیون مورد نظر خود را جستجو کنید..."
                className="flex-1 bg-transparent text-white placeholder:text-white/50 px-6 py-5 text-base outline-none"
              />
              <button className="gradient-gold text-charcoal px-8 py-5 flex items-center gap-2 font-medium hover:opacity-90 transition-opacity">
                <Search size={20} />
                <span className="hidden sm:inline">جستجو</span>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {["مبلمان", "فرش و قالی", "لوستر", "پرده", "دکور چوبی"].map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 rounded-full border border-white/20 text-white/75 text-sm hover:border-gold/40 hover:text-gold cursor-pointer transition-all duration-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
