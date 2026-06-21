import { useNavigate } from "react-router-dom";
import { Armchair, Lamp, Palette, Flower2, Frame, Bed, Megaphone, Store, Bath, Star } from "lucide-react";

const categories = [
  { icon: Armchair, label: "مبلمان", slug: "furniture", count: "۲,۴۰۰+" },
  { icon: Palette, label: "فرش و قالی", slug: "carpet", count: "۱,۸۰۰+" },
  { icon: Lamp, label: "لوستر و روشنایی", slug: "lighting", count: "۹۵۰+" },
  { icon: Frame, label: "پرده", slug: "curtain", count: "۱,۲۰۰+" },
  { icon: Bed, label: "کالای خواب", slug: "bedding", count: "۸۰۰+" },
  { icon: Palette, label: "دکور و کالای چوبی", slug: "wood-decor", count: "۶۵۰+" },
  { icon: Frame, label: "تابلو و آثار هنری", slug: "art", count: "۴۲۰+" },
  { icon: Bath, label: "سرویس بهداشتی و حمام", slug: "bathroom", count: "۳۴۰+" },
  { icon: Star, label: "اکسسوری خانه", slug: "accessories", count: "۲۸۰+" },
  { icon: Megaphone, label: "آگهی دست دوم", slug: "second-hand", count: "۳,۵۰۰+" },
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
          <span className="text-primary text-sm font-semibold tracking-wider">دسته‌بندی‌ها</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3">
            همه نیازهای خانه شما
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            از مبلمان تا دکور، از روشنایی تا گل و گیاه — هر آنچه برای زیبایی خانه نیاز دارید
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" style={{ perspective: '1500px' }}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.label}
                onClick={() => handleCategoryClick(cat.slug)}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-card/85 backdrop-blur-md border border-border/50 hover:border-primary/40 cursor-pointer transition-all duration-500 hover:shadow-luxury"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <div 
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center group-hover:text-primary transition-all duration-500"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                    boxShadow: `
                      0 12px 24px -6px rgba(0,0,0,0.3),
                      inset 0 2px 6px rgba(255, 255, 255, 0.1),
                      inset 0 -2px 6px rgba(0, 0, 0, 0.2)\n                    `,
                    transform: 'translateZ(32px) rotateX(-8deg)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Top highlight for 3D effect */}
                  <div 
                    className="absolute inset-x-2 top-1 h-1/3 rounded-lg opacity-40"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%)',
                      transform: 'translateZ(2px)'
                    }}
                  />
                  {/* Bottom shadow for depth */}
                  <div 
                    className="absolute inset-x-2 bottom-1 h-1/4 rounded-lg opacity-30"
                    style={{
                      background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 100%)',
                      transform: 'translateZ(2px)'
                    }}
                  />
                  {/* Hover glow overlay */}
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(145deg, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.1) 100%)',
                      transform: 'translateZ(4px)'
                    }}
                  />
                  <Icon 
                    size={28} 
                    className="relative text-white/70 group-hover:text-primary transition-colors duration-500"
                    style={{
                      filter: 'drop-shadow(0 4px 4px rgba(0, 0, 0, 0.3))',
                      transform: 'translateZ(16px) scale(1)',
                      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors duration-300 text-center">{cat.label}</span>
                <span className="text-xs text-muted-foreground">{cat.count} محصول</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
