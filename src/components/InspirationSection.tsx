// @ts-nocheck
import { useState } from "react";
import { ArrowLeft, Bookmark, Heart } from "lucide-react";
import { useInspirations } from "@/hooks/useInspirations";
import { Link } from "react-router-dom";
import { useSavedInspirations } from "@/hooks/useSavedInspirations";
import { Badge } from "./ui/badge";

const styleLabels: Record<string, string> = {
  "همه": "همه",
  "modern": "مدرن",
  "classic": "کلاسیک",
  "minimal": "مینیمال",
  "luxury": "لوکس",
  "traditional": "سنتی",
  "industrial": "صنعتی",
  "scandinavian": "اسکاندیناوی",
  "bohemian": "بوهمی"
};

const styles = ["همه", "modern", "classic", "minimal", "luxury", "traditional"];

const InspirationSection = () => {
  const [active, setActive] = useState("همه");
  const { saveInspiration, collections } = useSavedInspirations();
  
  const { data, isLoading } = useInspirations({
    style: active
  });

  const pins = data?.pages[0]?.slice(0, 8) || [];

  return (
    <section id="inspiration" className="py-24 bg-cream-dark">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">الهام دکوراسیون</span>
            <h2 className="text-4xl md:text-6xl font-black text-foreground mt-3 tracking-tight">ایده بگیرید، خلق کنید</h2>
            <p className="text-muted-foreground mt-4 max-w-lg text-lg text-right">
              هزاران ایدهٔ واقعی از خانه‌های ایرانی — ذخیره کنید و الهام بگیرید.
            </p>
          </div>
          <Link to="/inspirations" className="group flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all mt-5 md:mt-0">
            <span>مشاهده همه</span>
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
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
              {styleLabels[style]}
            </button>
          ))}
        </div>

        {/* Pinterest-style masonry board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading ? (
             [...Array(4)].map((_, i) => (
               <div key={i} className="aspect-[4/5] rounded-[1.4rem] bg-card animate-pulse border border-border/50" />
             ))
          ) : (
            pins.map((pin) => {
              const isSaved = collections?.some(c => c.items.some(i => i.inspiration_id === pin.id));
              
              return (
                <Link
                  key={pin.id}
                  to={`/inspirations/${pin.id}`}
                  className="group relative w-full aspect-square sm:aspect-[4/5] rounded-[1.4rem] overflow-hidden bg-card border border-border/50 hover:border-primary/30 shadow-card hover:shadow-luxury transition-all duration-500 hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  <img
                    src={pin.image_url}
                    alt={pin.title_fa || pin.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform ease-out group-hover:scale-105"
                    style={{ transitionDuration: '900ms' }}
                  />

                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 text-white z-10" />

                  <div className="absolute top-3 right-3 left-3 flex items-start justify-between z-20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Badge className="bg-white/20 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      {styleLabels[pin.style || ""] || pin.style}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isSaved) saveInspiration.mutate({ inspirationId: pin.id });
                      }}
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

                  <div className="absolute bottom-3 right-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-1.5 text-white text-right">
                    <h3 className="font-bold text-sm leading-snug line-clamp-2">{pin.title_fa || pin.title}</h3>
                    <div className="flex items-center justify-between border-t border-white/20 pt-2 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-gray-300">
                        <Heart size={12} className="fill-current text-red-400" />
                        {pin.save_count || 0} پسند
                      </span>
                      <span className="text-[10px] bg-primary/90 text-primary-foreground font-bold px-2.5 py-1 rounded-lg">
                        الهام بگیرید
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default InspirationSection;
