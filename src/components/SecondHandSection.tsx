import { useState } from "react";
import { ArrowLeft, MapPin, Heart, BadgeCheck } from "lucide-react";
import imgSofa from "@/assets/board/b-living.jpg";
import imgRug from "@/assets/board/b-classic.jpg";
import imgChandelier from "@/assets/board/b-decor.jpg";
import imgBed from "@/assets/board/b-bedroom2.jpg";

const ads = [
  { title: "مبل ال ۷ نفره", city: "تهران", price: "۱۲٬۰۰۰٬۰۰۰", condition: "در حد نو", image: imgSofa },
  { title: "فرش دست‌باف ۱۲ متری", city: "اصفهان", price: "۸٬۵۰۰٬۰۰۰", condition: "سالم", image: imgRug },
  { title: "لوستر کریستال ۱۲ شاخه", city: "شیراز", price: "۴٬۲۰۰٬۰۰۰", condition: "در حد نو", image: imgChandelier },
  { title: "تخت خواب دو نفره چوبی", city: "تبریز", price: "۶٬۸۰۰٬۰۰۰", condition: "سالم", image: imgBed },
];

const SecondHandSection = () => {
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  return (
    <section id="secondhand" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-gold text-sm font-semibold tracking-[0.2em] uppercase">آگهی دست دوم</span>
            <h2 className="text-4xl md:text-6xl font-black text-foreground mt-3 tracking-tight">بخرید، بفروشید</h2>
            <p className="text-muted-foreground mt-4 max-w-lg text-lg">
              لوازم دست دوم خانهٔ خود را بفروشید یا با قیمت مناسب خرید کنید.
            </p>
          </div>
          <div className="flex gap-3 mt-5 md:mt-0">
            <button className="gradient-gold text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-luxury">
              ثبت آگهی رایگان
              <ArrowLeft size={16} />
            </button>
            <a href="#" className="flex items-center gap-2 text-gold border border-gold/30 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gold/5 transition-colors">
              مشاهده همه آگهی‌ها
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {ads.map((ad, idx) => {
            const isLiked = !!liked[idx];
            return (
              <article
                key={idx}
                className="group rounded-[1.4rem] overflow-hidden bg-card border border-border hover:border-gold/30 shadow-card hover:shadow-luxury hover:-translate-y-1 transition-all duration-500 cursor-pointer"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={ad.image}
                    alt={ad.title}
                    loading="lazy"
                    className="w-full aspect-[4/5] object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Condition badge */}
                  <span className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-charcoal text-[11px] font-bold px-3 py-1 rounded-full">
                    <BadgeCheck size={13} className="text-emerald-brand" />
                    {ad.condition}
                  </span>
                  {/* Like button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLiked((s) => ({ ...s, [idx]: !s[idx] }));
                    }}
                    aria-label="پسندیدن"
                    className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <Heart size={16} className={isLiked ? "fill-red-500 text-red-500" : "text-charcoal"} />
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-foreground mb-2 line-clamp-1">{ad.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin size={14} />
                    {ad.city}
                  </div>
                  <div className="flex items-baseline gap-1 text-gold font-black">
                    {ad.price}
                    <span className="text-xs font-semibold text-muted-foreground">تومان</span>
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
