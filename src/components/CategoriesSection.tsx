import { useNavigate } from "react-router-dom";
import { Armchair, Lamp, Palette, Flower2, Frame, Bed, Megaphone, Store, Bath, Star } from "lucide-react";

const categories = [
  { icon: Armchair, label: "مبلمان", slug: "furniture", count: "۲,۴۰۰+", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80" },
  { icon: Palette, label: "فرش و قالی", slug: "carpet", count: "۱,۸۰۰+", image: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=400&q=80" },
  { icon: Lamp, label: "لوستر و روشنایی", slug: "lighting", count: "۹۵۰+", image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=400&q=80" },
  { icon: Frame, label: "پرده", slug: "curtain", count: "۱,۲۰۰+", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80" },
  { icon: Bed, label: "کالای خواب", slug: "bedding", count: "۸۰۰+", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80" },
  { icon: Palette, label: "دکور و کالای چوبی", slug: "wood-decor", count: "۶۵۰+", image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=400&q=80" },
  { icon: Frame, label: "تابلو و آثار هنری", slug: "art", count: "۴۲۰+", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80" },
  { icon: Bath, label: "سرویس بهداشتی و حمام", slug: "bathroom", count: "۳۴۰+", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80" },
  { icon: Star, label: "اکسسوری خانه", slug: "accessories", count: "۲۸۰+", image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=400&q=80" },
  { icon: Megaphone, label: "آگهی دست دوم", slug: "second-hand", count: "۳,۵۰۰+", image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=400&q=80" },
];

const CategoriesSection = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (slug: string) => {
    if (slug === "shops") {
      navigate("/shops");
    } else if (slug === "second-hand") {
      navigate("/second-hand");
    } else {
      navigate(`/shops?category=${slug}`);
    }
  };

  return (
    <section id="categories" className="py-24 bg-transparent relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold tracking-wider">دسته‌بندی‌های اصلی</span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mt-3 tracking-tight">
            همه نیازهای خانه شما
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-base sm:text-lg">
            از مبلمان تا دکور، از روشنایی تا پرده و فرش — هر آنچه برای زیبایی خانه نیاز دارید
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" style={{ perspective: "1500px" }}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.label}
                onClick={() => handleCategoryClick(cat.slug)}
                className="group relative overflow-hidden aspect-[3/4] rounded-[2rem] cursor-pointer shadow-lg hover:shadow-luxury transition-all duration-500 hover:-translate-y-2.5 border border-stone-200/80 dark:border-stone-800/80"
              >
                {/* Real High-End Interior Image */}
                <img
                  src={cat.image}
                  alt={cat.label}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                />

                {/* Ambient dark gradient overlay to anchor text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80 group-hover:from-black/60 transition-opacity duration-300" />

                {/* Floating premium tag */}
                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  <span className="text-[10px] font-bold text-white tracking-widest">HOMEINO</span>
                </div>

                {/* High-Contrast Luxury Dark Stone Bottom Panel */}
                <div className="absolute inset-x-3 bottom-3 p-4 rounded-[1.4rem] bg-stone-900/90 dark:bg-stone-950/95 backdrop-blur-md border border-white/10 flex flex-col gap-0.5 transition-all duration-500 group-hover:bg-primary group-hover:border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-white transition-colors duration-300">
                      {cat.label}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-primary transition-all duration-300">
                      <Icon size={15} />
                    </div>
                  </div>
                  <span className="text-xs text-stone-300 transition-colors duration-300 group-hover:text-white/80">
                    {cat.count} کالا
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
