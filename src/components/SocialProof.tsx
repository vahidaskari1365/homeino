import { Star, Users, Home, ShoppingBag } from "lucide-react";

const stats = [
  { icon: Users, value: "۱۵,۰۰۰+", label: "کاربر فعال" },
  { icon: Home, value: "۸,۵۰۰+", label: "خانه طراحی شده" },
  { icon: ShoppingBag, value: "۲۵,۰۰۰+", label: "محصول خریداری شده" },
  { icon: Star, value: "۴.۹", label: "امتیاز رضایت" },
];

const testimonials = [
  {
    name: "سارا محمدی",
    role: "خانه‌دار",
    content: "با هومینو تونستم کل پذیرایی رو با بودجه ۵ میلیون تومان بچینم. طراحی AI واقعاً دقیق بود!",
    rating: 5,
  },
  {
    name: "امیر حسینی",
    role: "طراح داخلی",
    content: "به عنوان یه طراح، هومینو سرعت کار من رو ۳ برابر کرد. پیشنهاد محصولات هوشمند عالیه.",
    rating: 5,
  },
  {
    name: "مریم کریمی",
    role: "تازه‌عروس",
    content: "برای جهیزیه از هومینو استفاده کردم. همه چی تحویل درب خونه شد، بدون استرس و دغدغه.",
    rating: 5,
  },
];

const SocialProof = () => {
  return (
    <section className="py-20 bg-cream-dark border-y border-border/50">
      <div className="container mx-auto px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="text-center group">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
                  <Icon size={28} className="text-gold" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <span className="text-gold text-sm font-medium">نظرات کاربران</span>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mt-3">
            اعتماد هزاران خانه‌دار به هومینو
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-luxury transition-all duration-300"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(item.rating)].map((_, i) => (
                  <Star key={i} size={16} className="fill-gold text-gold" />
                ))}
              </div>
              <p className="text-foreground/80 leading-relaxed mb-6 text-sm">
                "{item.content}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <span className="text-gold font-bold text-sm">
                    {item.name[0]}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm">
                    {item.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {item.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 pt-12 border-t border-border/50">
          <div className="text-center mb-8">
            <span className="text-muted-foreground text-sm">
              مورد اعتماد برندهای برتر
            </span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50">
            {["ایرانسل", "همراه اول", "دیجی‌کالا", "اسنپ", "تپسی"].map(
              (brand) => (
                <span
                  key={brand}
                  className="text-xl font-bold text-foreground/40 grayscale hover:grayscale-0 transition-all"
                >
                  {brand}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
