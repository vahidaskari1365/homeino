import { useEffect, useRef } from "react";
import { Search, Sparkles, ArrowLeft } from "lucide-react";
import sceneLiving from "@/assets/hero-cinematic-living.jpg";
import sceneBedroom from "@/assets/hero-cinematic-bedroom.jpg";
import sceneKitchen from "@/assets/hero-cinematic-kitchen.jpg";

// Kinetic headline words (RTL). `gold` marks the accent words.
const HEADLINE: { text: string; gold?: boolean; break?: boolean }[] = [
  { text: "خانه" },
  { text: "رؤیایی‌تان" },
  { text: "را" },
  { text: "طراحی", gold: true, break: true },
  { text: "کنید", gold: true },
];

const QUICK_TAGS = ["مبلمان", "فرش و قالی", "لوستر", "پرده", "دکور چوبی"];

// Cinematic scenes that cross-fade as the user scrolls through the hero.
const SCENES = [
  { src: sceneLiving, label: "نشیمن مدرن", caption: "نور طلایی غروب" },
  { src: sceneBedroom, label: "اتاق خواب آرام", caption: "صبح‌های روشن" },
  { src: sceneKitchen, label: "آشپزخانه طراحی‌شده", caption: "گرمای دلنشین" },
];

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Static first scene, fully visible content.
      const first = sceneRefs.current[0];
      if (first) first.style.opacity = "1";
      if (contentRef.current) contentRef.current.style.opacity = "1";
      chipRefs.current[0] && (chipRefs.current[0].style.opacity = "1");
      return;
    }

    let raf = 0;
    const n = SCENES.length;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      // p: 0 at top of hero, 1 when hero is fully scrolled past
      const p = Math.min(Math.max(-rect.top / Math.max(total, 1), 0), 1);

      // Drive each scene's opacity + cinematic 3D motion based on a moving window.
      sceneRefs.current.forEach((el, i) => {
        if (!el) return;
        const center = i / (n - 1);
        const dist = Math.abs(p - center);
        const span = 1 / (n - 1);
        const opacity = Math.min(Math.max(1 - dist / span, 0), 1);
        el.style.opacity = opacity.toFixed(3);

        // Ken Burns / 3D depth: slow zoom, drift and a subtle perspective tilt.
        const local = (p - center) / span; // -1..1 around this scene
        const scale = 1.16 - opacity * 0.1; // active scene slightly tighter
        const ty = local * 6; // vertical drift in %
        const rot = local * 3.2; // perspective tilt in deg
        el.style.transform = `translate3d(0, ${ty}%, 0) rotateX(${rot}deg) scale(${scale.toFixed(3)})`;
        el.style.filter = `saturate(${(1.05 + opacity * 0.12).toFixed(2)}) contrast(${(1.02 + opacity * 0.06).toFixed(2)})`;
      });

      // Scene caption chips
      chipRefs.current.forEach((el, i) => {
        if (!el) return;
        const center = i / (n - 1);
        const dist = Math.abs(p - center);
        const span = 1 / (n - 1);
        const o = Math.min(Math.max(1 - dist / span, 0), 1);
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(${(1 - o) * 12}px)`;
      });

      // Foreground content gently lifts, scales and fades as you scroll in.
      if (contentRef.current) {
        const fade = Math.min(Math.max(1 - p * 1.4, 0), 1);
        contentRef.current.style.opacity = (0.15 + fade * 0.85).toFixed(3);
        contentRef.current.style.transform = `translate3d(0, ${(-p * 60).toFixed(1)}px, 0) scale(${(1 - p * 0.06).toFixed(3)})`;
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={sectionRef} className="cine-hero" style={{ height: "120vh" }}>
      <div className="cine-stage flex items-center">
        {/* Cinematic scene layers (cross-fade on scroll) */}
        {SCENES.map((s, i) => (
          <div
            key={i}
            ref={(el) => (sceneRefs.current[i] = el)}
            className="cine-scene"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            <img src={s.src} alt={s.label} loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}

        {/* Cinematic grade, bloom, grain, vignette */}
        <div className="cine-grade" />
        <div className="cine-bloom hero-glow" />
        <div className="cine-grain" />
        <div className="cine-vignette" />

        {/* Scene caption chips (top-left in RTL = top-right visually) */}
        <div className="absolute top-28 right-6 sm:right-12 z-20 flex flex-col items-end gap-2 pointer-events-none">
          {SCENES.map((s, i) => (
            <div
              key={i}
              ref={(el) => (chipRefs.current[i] = el)}
              className="cine-chip flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-white/90 text-xs sm:text-sm font-semibold">{s.label}</span>
              <span className="text-white/45 text-[11px] hidden sm:inline">· {s.caption}</span>
            </div>
          ))}
        </div>

        {/* Foreground content - perfectly centered, single-line 3D text */}
        <div className="relative z-10 container mx-auto px-6 sm:px-10 flex items-center justify-center min-h-[85vh]">
          <div ref={contentRef} className="cine-content max-w-5xl text-center flex flex-col items-center justify-center">
            {/* Kicker */}
            <div className="hero-word inline-flex items-center justify-center gap-3 mb-7" style={{ animationDelay: "0.05s" }}>
              <span className="h-px w-10 bg-primary/70" />
              <span className="hero-kicker text-primary text-xs sm:text-sm font-semibold uppercase tracking-wider">
                مرجع تخصصی دکوراسیون و طراحی داخلی
              </span>
              <span className="h-px w-10 bg-primary/70" />
            </div>

            {/* Strictly single-line centered oversized 3D headline */}
            <h1 className="w-full text-center py-4 select-none pointer-events-none drop-shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex items-center justify-center">
              <span className="block text-[clamp(1.5rem,5.2vw,4.8rem)] leading-none font-black text-3d-luxury whitespace-nowrap">
                خانه رؤیایی‌تان را طراحی کنید
              </span>
            </h1>

            {/* Animated gold rule */}
            <div className="hero-rule h-[3px] w-40 sm:w-64 bg-primary mt-7 mx-auto rounded-full" style={{ animationDelay: "0.9s" }} />

            {/* Subhead */}
            <p className="hero-word mt-8 text-base sm:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" style={{ animationDelay: "1.0s" }}>
              از الهام گرفتن تا خرید، از طراحی با هوش مصنوعی تا تجهیز کامل خانه — همه چیز در یک پلتفرم.
            </p>

            {/* Search — the marketplace CTA */}
            <div className="hero-word mt-10 max-w-2xl mx-auto" style={{ animationDelay: "1.1s" }}>
              <div className="flex items-center bg-white/[0.07] backdrop-blur-xl border border-white/15 rounded-full overflow-hidden shadow-luxury transition-all duration-300 hover:border-primary/50 focus-within:border-gold/60">
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
              <div className="flex flex-wrap justify-center gap-2.5 mt-5">
                {QUICK_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-1.5 rounded-full border border-white/15 text-white/70 text-sm hover:border-primary/50 hover:text-primary cursor-pointer transition-all duration-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="hero-word flex flex-col sm:flex-row gap-4 justify-center mt-10" style={{ animationDelay: "1.2s" }}>
              <a
                href="#ai-design"
                className="group gradient-gold text-charcoal px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.03] transition-transform shadow-luxury"
              >
                <Sparkles size={20} />
                طراحی رایگان با هوش مصنوعی
              </a>
              <a
                href="#complete-sets"
                className="group text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 border border-white/25 hover:border-gold/60 hover:text-primary transition-colors backdrop-blur-sm"
              >
                ست‌های آماده دکوراسیون
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 z-20">
          <span className="text-[11px] tracking-widest uppercase">اسکرول کنید</span>
          <span className="scroll-cue w-5 h-9 rounded-full border border-white/30 flex items-start justify-center p-1.5">
            <span className="w-1 h-2 rounded-full bg-primary" />
          </span>
        </div>

        {/* Bottom fade into the page */}
        <div className="cine-fade-bottom" />
      </div>
    </section>
  );
};

export default HeroSection;
