import { ShoppingCart, Truck, Wrench, Handshake } from "lucide-react";

const services = [
  {
    icon: ShoppingCart,
    title: "خرید محصولات",
    desc: "محصولات انتخاب شده خود را به راحتی خریداری کنید",
  },
  {
    icon: Handshake,
    title: "هماهنگی با فروشگاه‌ها",
    desc: "ما هماهنگی کامل با فروشگاه‌ها را انجام می‌دهیم",
  },
  {
    icon: Truck,
    title: "ارسال محصولات",
    desc: "ارسال مطمئن و سریع به سراسر کشور",
  },
  {
    icon: Wrench,
    title: "نصب و اجرا",
    desc: "تیم حرفه‌ای برای نصب و چیدمان در منزل شما",
  },
];

const ServicesSection = () => {
  return (
    <section className="py-24 bg-emerald-brand relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-72 h-72 border border-primary-foreground/20 rounded-full" />
        <div className="absolute bottom-10 left-10 w-48 h-48 border border-primary-foreground/20 rounded-full" />
      </div>
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-gold-light text-sm font-medium">خدمات ما</span>
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mt-3">
            تجربه کامل تجهیز خانه
          </h2>
          <p className="text-primary-foreground/60 mt-4 max-w-xl mx-auto">
            از انتخاب تا نصب، ما در کنار شما هستیم
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <div key={idx} className="text-center p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 hover:bg-primary-foreground/10 transition-all duration-500">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gold/15 flex items-center justify-center mb-6">
                  <Icon size={28} className="text-gold" />
                </div>
                <h3 className="text-primary-foreground font-bold text-lg mb-2">{service.title}</h3>
                <p className="text-primary-foreground/50 text-sm leading-relaxed">{service.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
