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
  { image: imgLiving, title: "نشیمن مدرن با نور طلایی", style: "مدرن", saves: "۲٫۴k", tag: "ترند" },
  { image: imgBath, title: "حمام لوکس با سنگ مرمر", style: "لوکس", saves: "۱٫۱k" },
  { image: imgOffice, title: "گوشهٔ کار دنج و سبز", style: "مینیمال", saves: "۹۸۰" },
  { image: imgClassic, title: "پذیرایی کلاسیک با فرش دست‌باف", style: "کلاسیک", saves: "۳٫۲k", tag: "محبوب" },
  { image: imgKitchen, title: "آشپزخانهٔ طراحی‌شده", style: "مدرن", saves: "۱٫۸k" },
  { image: imgDecor, title: "میز کنسول و دکور دست‌ساز", style: "مینیمال", saves: "۷۴۰" },
  { image: imgBedroom, title: "اتاق خواب آرام و روشن", style: "مدرن", saves: "۲٫۱k" },
  { image: imgKitchen2, title: "آشپزخانهٔ شیک با جزئیات طلایی", style: "لوکس", saves: "۱٫۳k" },
  { image: imgBedroom2, title: "اتاق خواب با چوب گرم", style: "سنتی", saves: "۸۶۰" },
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
            <span className="text-gold text-sm font-semibold tracking-[0.2em] uppercase">الهام دکوراسیون</span>
            <h2 className="text-4xl md:text-6xl font-black text-foreground mt-3 tracking-tight">ایده بگیرید، خلق کنید</h2>
            <p className="text-muted-foreground mt-4 max-w-lg text-lg">
              هزاران ایدهٔ واقعی از خانه‌های ایرانی — ذخیره کنید و الهام بگیرید.
            </p>
          </div>
          <a href="#" className="group flex items-center gap-2 text-gold font-semibold hover:gap-3 transition-all mt-5 md:mt-0">
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
                  : "bg-card border border-border text-muted-foreground hover:border-gold/40 hover:text-gold"
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Pinterest-style masonry board */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-5 [column-fill:_balance]">
          {visible.map((pin, idx) => {
            const isSaved = !!saved[idx];
            return (
              <article
                key={pin.title}
                className="group relative mb-4 md:mb-5 break-inside-avoid rounded-[1.4rem] overflow-hidden bg-card shadow-card hover:shadow-luxury transition-all duration-500 hover:-translate-y-1 cursor-pointer"
              >
                <img
                  src={pin.image}
                  alt={pin.title}
                  loading="lazy"
                  className="w-full h-auto block object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                />

                {/* Hover scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-charcoal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                {/* Top row: style badge + save button */}
                <div className="absolute top-3 right-3 left-3 flex items-start justify-between">
                  <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {pin.style}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSaved((s) => ({ ...s, [idx]: !s[idx] }));
                    }}
                    aria-label="ذخیره"
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                      isSaved
                        ? "gradient-gold text-charcoal"
                        : "bg-white/90 text-charcoal opacity-0 group-hover:opacity-100 hover:bg-white"
                    }`}
                  >
                    <Bookmark size={15} className={isSaved ? "fill-current" : ""} />
                    {isSaved ? "ذخیره شد" : "ذخیره"}
                  </button>
                </div>

                {/* Trend/popular pill */}
                {pin.tag && (
                  <span className="absolute top-3 right-3 group-hover:opacity-0 transition-opacity duration-300 bg-gold text-charcoal text-[11px] font-bold px-3 py-1 rounded-full shadow-luxury">
                    {pin.tag}
                  </span>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 right-0 left-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                  <h3 className="text-white font-bold leading-snug mb-2">{pin.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-white/80 text-xs">
                      <Heart size={13} className="fill-current text-gold" />
                      {pin.saves} ذخیره
                    </span>
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-colors">
                      <Share2 size={14} />
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
