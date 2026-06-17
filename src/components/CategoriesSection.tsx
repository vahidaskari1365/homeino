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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4" style={{ perspective: '1500px' }}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.label}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border hover:border-gold/40 cursor-pointer transition-all duration-500"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <div 
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center group-hover:text-gold transition-all duration-500"
                  style={{
                    background: 'linear-gradient(145deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.7) 50%, hsl(var(--accent) / 0.5) 100%)',
                    boxShadow: `
                      0 12px 24px -6px hsl(var(--accent) / 0.5),
                      0 6px 12px -3px hsl(var(--accent) / 0.4),
                      0 3px 6px -2px hsl(var(--accent) / 0.3),
                      inset 0 2px 6px rgba(255, 255, 255, 0.4),
                      inset 0 -2px 6px rgba(0, 0, 0, 0.15),
                      inset 2px 0 4px rgba(255, 255, 255, 0.2),
                      inset -2px 0 4px rgba(0, 0, 0, 0.05)
                    `,
                    transform: 'translateZ(32px) rotateX(-8deg)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Top highlight for 3D effect */}
                  <div 
                    className="absolute inset-x-2 top-1 h-1/3 rounded-lg opacity-60"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
                      transform: 'translateZ(2px)'
                    }}
                  />
                  {/* Bottom shadow for depth */}
                  <div 
                    className="absolute inset-x-2 bottom-1 h-1/4 rounded-lg opacity-40"
                    style={{
                      background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%)',
                      transform: 'translateZ(2px)'
                    }}
                  />
                  {/* Hover glow overlay */}
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(145deg, hsl(var(--gold) / 0.25) 0%, hsl(var(--gold) / 0.1) 100%)',
                      transform: 'translateZ(4px)'
                    }}
                  />
                  <Icon 
                    size={28} 
                    className="relative text-muted-foreground group-hover:text-gold transition-colors duration-500"
                    style={{
                      filter: 'drop-shadow(0 4px 4px rgba(0, 0, 0, 0.2)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))',
                      transform: 'translateZ(16px) scale(1)',
                      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
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
