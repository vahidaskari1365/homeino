// @ts-nocheck
import { useState } from "react";
import { useInspirations } from "@/hooks/useInspirations";
import { Bookmark, Heart, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useSavedInspirations } from "@/hooks/useSavedInspirations";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

const styles = ["همه", "modern", "classic", "minimal", "luxury", "traditional", "industrial", "scandinavian", "bohemian"];
const styleLabels: Record<string, string> = {
  "همه": "همه سبک‌ها",
  "modern": "مدرن",
  "classic": "کلاسیک",
  "minimal": "مینیمال",
  "luxury": "لوکس",
  "traditional": "سنتی",
  "industrial": "صنعتی",
  "scandinavian": "اسکاندیناوی",
  "bohemian": "بوهمی"
};

const roomTypes = ["همه", "living", "bedroom", "kitchen", "bathroom", "office", "dining", "outdoor"];
const roomTypeLabels: Record<string, string> = {
  "همه": "همه فضاها",
  "living": "نشیمن",
  "bedroom": "اتاق خواب",
  "kitchen": "آشپزخانه",
  "bathroom": "حمم و سرویس",
  "office": "اتاق کار",
  "dining": "ناهارخوری",
  "outdoor": "فضای باز"
};

const Inspirations = () => {
  const [activeStyle, setActiveStyle] = useState("همه");
  const [activeRoomType, setActiveRoomType] = useState("همه");
  const [search, setSearch] = useState("");
  const { saveInspiration, collections } = useSavedInspirations();
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInspirations({
    style: activeStyle,
    roomType: activeRoomType,
    search: search
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const allInspirations = data?.pages.flatMap((page) => page) || [];

  return (
    <div className="min-h-screen bg-cream-dark">
      <Navbar />
      
      <main className="container mx-auto px-6 py-24">
        <div className="flex flex-col gap-8 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">الهام دکوراسیون</h1>
            <p className="text-muted-foreground mt-4 text-lg">
              هزاران ایدهٔ واقعی برای طراحی داخلی خانه‌تان.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="جستجو در ایده‌ها..."
                className="pr-10 bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
               {/* Filters would go here if we want more dropdowns */}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <Filter size={16} /> سبک:
              </span>
              <div className="flex flex-wrap gap-2">
                {styles.map((style) => (
                  <button
                    key={style}
                    onClick={() => setActiveStyle(style)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeStyle === style
                        ? "gradient-gold text-primary-foreground shadow-luxury"
                        : "bg-card border border-border text-muted-foreground hover:border-gold/40"
                    }`}
                  >
                    {styleLabels[style]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <Filter size={16} /> فضا:
              </span>
              <div className="flex flex-wrap gap-2">
                {roomTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveRoomType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeRoomType === type
                        ? "gradient-gold text-primary-foreground shadow-luxury"
                        : "bg-card border border-border text-muted-foreground hover:border-gold/40"
                    }`}
                  >
                    {roomTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-[1.4rem] bg-card animate-pulse border border-border/50" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allInspirations.map((item) => {
                const isSaved = collections?.some(c => c.items.some(i => i.inspiration_id === item.id));
                
                return (
                  <Link
                    key={item.id}
                    to={`/inspirations/${item.id}`}
                    className="group relative w-full aspect-[4/5] rounded-[1.4rem] overflow-hidden bg-card border border-border/50 hover:border-primary/30 shadow-card hover:shadow-luxury transition-all duration-500 hover:-translate-y-1 flex flex-col"
                  >
                    <img
                      src={item.image_url}
                      alt={item.title_fa || item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform ease-out group-hover:scale-105"
                      style={{ transitionDuration: '900ms' }}
                    />

                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 text-white z-10" />

                    <div className="absolute top-3 right-3 left-3 flex items-start justify-between z-20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Badge className="bg-white/20 backdrop-blur-md border border-white/10 text-white">
                        {styleLabels[item.style || ""] || item.style}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isSaved) saveInspiration.mutate({ inspirationId: item.id });
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
                      <h3 className="font-bold text-sm leading-snug line-clamp-2">{item.title_fa || item.title}</h3>
                      <div className="flex items-center justify-between border-t border-white/20 pt-2 mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-gray-300">
                          <Heart size={12} className="fill-current text-red-400" />
                          {item.save_count || 0} پسند
                        </span>
                        <span className="text-[10px] bg-primary/90 text-primary-foreground font-bold px-2.5 py-1 rounded-lg">
                          مشاهده ایده
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {hasNextPage && (
              <div ref={ref} className="py-12 flex justify-center">
                {isFetchingNextPage && <div className="loading-spinner" />}
              </div>
            )}

            {allInspirations.length === 0 && (
              <div className="text-center py-24 bg-card rounded-3xl border border-dashed border-border">
                <Search size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2">موردی یافت نشد</h3>
                <p className="text-muted-foreground">با تغییر فیلترها، ایده‌های جدیدی پیدا کنید.</p>
                <Button variant="link" onClick={() => {
                  setActiveStyle("همه");
                  setActiveRoomType("همه");
                  setSearch("");
                }}>پاک کردن فیلترها</Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Inspirations;
