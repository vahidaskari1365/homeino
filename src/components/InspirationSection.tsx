import { useState } from "react";
import { ArrowLeft, Bookmark, Heart, Share2 } from "lucide-react";
import imgLiving from "@/assets/board/b-living.jpg";
import imgBedroom from "@/assets/board/b-bedroom.jpg";
import imgKitchen from "@/assets/board/b-kitchen.jpg";
import imgOffice from "@/assets/board/b-office.jpg";
import imgBath from "@/assets/board/b-bath.jpg";
import imgDecor from "@/assets/board/b-decor.jpg";
import imgClassic from "@/assets/board/b-classic.jpg";
import imgBedroom2 from "@/assets/board/b-bedroom2.jpg";
import imgKitchen2 from "@/assets/board/b-kitchen2.jpg";

const styles = ["همه", "مدرن", "کلاسیک", "مینیمال", "لوکس", "سنتی"];

type Pin = { image: string; title: string; style: string; saves: string; tag?: string };

const pins: Pin[] = [
  { image: imgLiving, title: "نشیمن مدرن با نور طلایی", style: "مدرن", saves: "۲.۴k", tag: "ترند" },
  { image: imgBath, title: "حمام لوکس با سنگ مرمر", style: "لوکس", saves: "۱.۱k" },
  { image: imgOffice, title: "گوشهٔ کار دنج و سبز", style: "مینیمال", saves: "۹۸۰" },
  { image: imgClassic, title: "پذیرایی کلاسیک با فرش دست‌باف", style: "کلاسیک", saves: "۳.۲k", tag: "محبوب" },
  { image: imgKitchen, title: "آشپزخانهٔ طراحی‌شده", style: "مدرن", saves: "۱.۸k" },
  { image: imgDecor, title: "میز کنسول و دکور دست‌ساز", style: "مینیمال", saves: "۷۴۰" },
  { image: imgBedroom, title: "اتاق خواب آرام و روشن", style: "مدرن", saves: "۲.۱k" },
  { image: imgKitchen2, title: "آشپزخانهٔ شیک با جزیره سنگی", style: "لوکس", saves: "۱.۵k" },
  { image: imgBedroom2, title: "اتاق خواب رویایی با نور گرم", style: "لوکس", saves: "۲.۷k", tag: "ویژه" },
];

const InspirationSection = () => {
  const [active, setActive] = useState("همه");
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const visible = active === "همه" ? pins : pins.filter((p) => p.style === active);

  return (
    <section id="inspiration" className="py-24 bg-cream-dark">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">الهام دکوراسیون</span>
            <h2 className="text-4xl md:text-6xl font-black text-foreground mt-3 tracking-tight">ایده بگیرید، خلق کنید</h2>
            <p className="text-muted-foreground mt-4 max-w-lg text-lg">
              هزاران ایدهٔ واقعی از خانه‌های ایرانی — ذخیره کنید و الهام بگیرید.
            </p>
          </div>
          <a href="#" className="group flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all mt-5 md:mt-0">
            <span>مشاهده همه</span>
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Style Filters */}
        <div className="flex flex-wrap gap-2.5 mb-10">
          {styles.map((style) => (
            <button
              key={style}
              onClick={() => setActive(style)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                active === style
                  ? "gradient-gold text-primary-foreground shadow-luxury"
                  : "bg-card border border-border text-muted-foreground hover:border-gold/40 hover:text-primary"
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Pinterest-style masonry board with beautiful hover reveals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {visible.map((pin, idx) => {
            const isSaved = !!saved[idx];
            return (
              <article
                key={pin.title}
                className="group relative w-full aspect-square sm:aspect-[4/5] rounded-[1.4rem] overflow-hidden bg-card border border-border/50 hover:border-primary/30 shadow-card hover:shadow-luxury transition-all duration-500 hover:-translate-y-1 cursor-pointer flex flex-col"
              >
                <img
                  src={pin.image}
                  alt={pin.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
                />

                {/* Hover glassmorphic scrim overlay */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 text-white z-10" />

                {/* Overlaid items on top */}
                <div className="absolute top-3 right-3 left-3 flex items-start justify-between z-20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="bg-white/20 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    {pin.style}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSaved((s) => ({ ...s, [idx]: !s[idx] }));
                    }}
                    aria-label="ذخیره"
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                      isSaved
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/90 text-charcoal hover:bg-white"
                    }`}
                  >
                    <Bookmark size={13} className={isSaved ? "fill-current" : ""} />
                    {isSaved ? "ذخیره شد" : "ذخیره"}
                  </button>
                </div>

                {/* Trend/popular badge on top left when NOT hovered */}
                {pin.tag && (
                  <span className="absolute top-3 right-3 group-hover:opacity-0 transition-opacity duration-300 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md z-20">
                    {pin.tag}
                  </span>
                )}

                {/* Overlaid items on bottom */}
                <div className="absolute bottom-3 right-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-1.5 text-white">
                  <h3 className="font-bold text-sm leading-snug line-clamp-2">{pin.title}</h3>
                  <div className="flex items-center justify-between border-t border-white/20 pt-2 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-gray-300">
                      <Heart size={12} className="fill-current text-red-400" />
                      {pin.saves} پسند
                    </span>
                    <span className="text-[10px] bg-primary/90 text-primary-foreground font-bold px-2.5 py-1 rounded-lg">
                      الهام بگیرید
                    </span>
                  </div>
                </div>

                {/* Fallback Static Card Content under pin (visible on mobile / when not hovered) */}
                <div className="p-3.5 flex flex-col gap-1 md:hidden">
                  <h3 className="font-bold text-xs text-foreground line-clamp-1">{pin.title}</h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                    <span>{pin.style}</span>
                    <span className="flex items-center gap-1">
                      <Heart size={11} className="fill-current text-red-500" />
                      {pin.saves}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default InspirationSection;
