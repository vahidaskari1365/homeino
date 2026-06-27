import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Heart, BadgeCheck, Tag, Flame, Sparkles } from "lucide-react";
import imgSofa from "@/assets/board/b-living.jpg";
import imgRug from "@/assets/board/b-classic.jpg";
import imgChandelier from "@/assets/board/b-decor.jpg";
import imgBed from "@/assets/board/b-bedroom2.jpg";

const ads = [
  { title: "مبل ال ۷ نفره", city: "تهران", price: "۱۲,۰۰۰,۰۰۰", condition: "در حد نو", image: imgSofa, isUrgent: true },
  { title: "فرش دست‌باف ۱۲ متری", city: "اصفهان", price: "۸,۵۰۰,۰۰۰", condition: "سالم", image: imgRug, isFeatured: true },
  { title: "لوستر کریستال ۱۲ شاخه", city: "شیراز", price: "۴,۲۰۰,۰۰۰", condition: "در حد نو", image: imgChandelier },
  { title: "تخت خواب دو نفره چوبی", city: "تبریز", price: "۶,۸۰۰,۰۰۰", condition: "سالم", image: imgBed },
];

const SecondHandSection = () => {
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const navigate = useNavigate();

  return (
    <section id="secondhand" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="h-4" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ads.map((ad, idx) => {
            const isLiked = !!liked[idx];
            return (
              <article
                key={idx}
                onClick={() => navigate("/second-hand")}
                className="group w-full rounded-[1.4rem] overflow-hidden bg-card border border-border/50 hover:border-primary/30 hover:shadow-luxury hover:-translate-y-1 transition-all duration-500 cursor-pointer relative flex flex-col shadow-card"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={ad.image}
                    alt={ad.title}
                    loading="lazy"
                    className="w-full aspect-square sm:aspect-[4/5] object-cover transition-transform ease-out group-hover:scale-105"
                    style={{ transitionDuration: '900ms' }}
                  />

                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
                    <span className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-charcoal text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      <BadgeCheck size={12} className="text-emerald-brand" />
                      {ad.condition}
                    </span>
                    {ad.isUrgent && (
                      <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                        <Flame size={12} />
                        فوری
                      </span>
                    )}
                    {ad.isFeatured && (
                      <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                        <Sparkles size={12} />
                        ویژه
                      </span>
                    )}
                  </div>

                  {/* Like button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLiked((s) => ({ ...s, [idx]: !s[idx] }));
                    }}
                    aria-label="پسندیدن"
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors z-10"
                  >
                    <Heart size={14} className={isLiked ? "fill-red-500 text-red-500" : "text-charcoal"} />
                  </button>

                  {/* Hover Info Overlay */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 text-white z-20">
                    <h3 className="font-bold text-base line-clamp-2 mb-1">{ad.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-300 mb-3">
                      <MapPin size={12} />
                      {ad.city}
                    </div>
                    <div className="flex items-center justify-between border-t border-white/20 pt-2">
                      <span className="text-primary font-extrabold text-sm">
                        {ad.price} <span className="text-[10px] text-gray-300">تومان</span>
                      </span>
                      <span className="text-[10px] bg-primary/90 text-primary-foreground font-bold px-2.5 py-1 rounded-lg">
                        مشاهده آگهی
                      </span>
                    </div>
                  </div>
                </div>

                {/* Static fallback content under card (visible normally) */}
                <div className="p-4">
                  <h3 className="font-bold text-foreground mb-1 line-clamp-1">{ad.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      {ad.city}
                    </div>
                    <div className="text-primary font-bold">
                      {ad.price} <span className="text-[10px] text-muted-foreground font-normal">تومان</span>
                    </div>
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

export default SecondHandSection;
