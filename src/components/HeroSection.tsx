import { useEffect, useRef } from "react";
import { Search, Sparkles, ArrowLeft } from "lucide-react";
import heroImg from "@/assets/hero-living.jpg";
import OptimizedImage from "./OptimizedImage";

// Kinetic headline words (RTL). `gold` marks the accent words.
const HEADLINE: { text: string; gold?: boolean; break?: boolean }[] = [
  { text: "خانه" },
  { text: "رؤیایی‌تان" },
  { text: "را" },
  { text: "طراحی", gold: true, break: true },
  { text: "کنید", gold: true },
];

const QUICK_TAGS = ["مبلمان", "فرش و قالی", "لوستر", "پرده", "دکور چوبی"];

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
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image (parallax) */}
      <div ref={parallaxRef} className="absolute inset-0 parallax-bg">
        <OptimizedImage
          src={heroImg}
          alt="دکوراسیون لوکس"
          className="w-full h-full object-cover scale-110"
          width={1920}
          height={1080}
          lazy={false}
        />
        {/* High-contrast editorial wash: darker toward the start (right in RTL) */}
        <div className="absolute inset-0 bg-gradient-to-l from-charcoal/30 via-charcoal/55 to-charcoal/85" />
        <div className="absolute inset-0 gradient-hero hero-glow opacity-70" />
      </div>

      {/* Content — exaggerated minimalism, right-aligned for RTL */}
      <div className="relative z-10 container mx-auto px-6 sm:px-10">
        <div className="max-w-5xl text-right">
          {/* Kicker */}
          <div
            className="hero-word inline-flex items-center gap-3 mb-7"
            style={{ animationDelay: "0.05s" }}
          >
            <span className="h-px w-10 bg-gold/70" />
            <span className="hero-kicker text-gold text-[11px] sm:text-xs font-semibold uppercase">
              مرجع تخصصی دکوراسیون و طراحی داخلی
            </span>
          </div>

          {/* Oversized kinetic headline */}
          <h1 className="flex flex-wrap justify-end items-end gap-x-[0.28em] font-black text-white tracking-[-0.03em] leading-[0.95] text-[clamp(2.75rem,11vw,8.5rem)]">
            {HEADLINE.map((w, i) => (
              <span key={i} className="contents">
                {w.break && <span className="basis-full h-0" />}
                <span className="hero-mask">
                  <span
                    className={`hero-word ${w.gold ? "text-gold" : "text-white"}`}
                    style={{ animationDelay: `${0.2 + i * 0.12}s` }}
                  >
                    {w.text}
                  </span>
                </span>
              </span>
            ))}
          </h1>

          {/* Animated gold rule */}
          <div
            className="hero-rule h-[3px] w-40 sm:w-64 bg-gold mt-7 ml-auto rounded-full"
            style={{ animationDelay: "0.9s" }}
          />

          {/* Subhead */}
          <p
            className="hero-word mt-8 text-base sm:text-xl text-white/70 max-w-2xl ml-auto leading-relaxed"
            style={{ animationDelay: "1s" }}
          >
            از الهام گرفتن تا خرید، از طراحی با هوش مصنوعی تا تجهیز کامل خانه — همه چیز در یک پلتفرم.
          </p>

          {/* Search — the marketplace CTA */}
          <div
            className="hero-word mt-10 max-w-2xl ml-auto"
            style={{ animationDelay: "1.1s" }}
          >
            <div className="flex items-center bg-white/[0.07] backdrop-blur-xl border border-white/15 rounded-full overflow-hidden shadow-luxury transition-all duration-300 hover:border-gold/50 focus-within:border-gold/60">
              <input
                type="text"
                aria-label="جستجوی کالا یا سبک دکوراسیون"
                placeholder="نام کالا یا سبک دکوراسیون مورد نظر خود را جستجو کنید..."
                className="flex-1 bg-transparent text-white placeholder:text-white/45 px-7 py-5 text-base outline-none"
              />
              <button
                aria-label="جستجو"
                className="gradient-gold text-charcoal m-1.5 px-7 py-3.5 rounded-full flex items-center gap-2 font-bold hover:opacity-90 transition-opacity"
              >
                <Search size={20} />
                <span className="hidden sm:inline">جستجو</span>
              </button>
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap justify-end gap-2.5 mt-5">
              {QUICK_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 rounded-full border border-white/15 text-white/70 text-sm hover:border-gold/50 hover:text-gold cursor-pointer transition-all duration-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div
            className="hero-word flex flex-col sm:flex-row gap-4 justify-end mt-10"
            style={{ animationDelay: "1.2s" }}
          >
            <a
              href="#ai-design"
              className="group gradient-gold text-charcoal px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.03] transition-transform shadow-luxury"
            >
              <Sparkles size={20} />
              طراحی رایگان با هوش مصنوعی
            </a>
            <a
              href="#complete-sets"
              className="group text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 border border-white/25 hover:border-gold/60 hover:text-gold transition-colors"
            >
              ست‌های آماده دکوراسیون
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60">
        <span className="text-[11px] tracking-widest uppercase">اسکرول</span>
        <span className="scroll-cue w-5 h-9 rounded-full border border-white/30 flex items-start justify-center p-1.5">
          <span className="w-1 h-2 rounded-full bg-gold" />
        </span>
      </div>

      {/* Bottom fade into the page */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
