import { Armchair, Lamp, Palette, Flower2, Frame, Bed, Megaphone, Store } from "lucide-react";

const categories = [
  { icon: Armchair, label: "مبلمان", count: "۲,۴۰۰+" },
  { icon: Palette, label: "فرش و قالی", count: "۱,۸۰۰+" },
  { icon: Lamp, label: "لوستر و آباژور", count: "۹۵۰+" },
  { icon: Frame, label: "پرده", count: "۱,۲۰۰+" },
  { icon: Bed, label: "کالای خواب", count: "۸۰۰+" },
  { icon: Palette, label: "دکور و کالای چوبی", count: "۶۵۰+" },
  { icon: Frame, label: "تابلو و آثار هنری", count: "۴۲۰+" },
  { icon: Flower2, label: "گل و گیاه", count: "۳۴۰+" },
  { icon: Store, label: "فروشگاه‌ها", count: "۲۸۰+" },
  { icon: Megaphone, label: "آگهی دست دوم", count: "۳,۵۰۰+" },
];

const CategoriesSection = () => {
  return (
    <section id="categories" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-gold text-sm font-medium tracking-wider">دسته‌بندی‌ها</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3">
            همه نیازهای خانه شما
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            از مبلمان تا دکور، از روشنایی تا گل و گیاه — هر آنچه برای زیبایی خانه نیاز دارید
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4" style={{ perspective: '1000px' }}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.label}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border hover:border-gold/30 hover:shadow-luxury cursor-pointer transition-all duration-500"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:text-gold transition-all duration-500"
                  style={{
                    background: 'linear-gradient(145deg, hsl(var(--accent)), hsl(var(--accent) / 0.7))',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    transform: 'translateZ(12px)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <Icon 
                    size={26} 
                    className="text-muted-foreground group-hover:text-gold transition-colors duration-500"
                    style={{
                      filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))',
                      transform: 'translateZ(8px)'
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground text-center">{cat.label}</span>
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
