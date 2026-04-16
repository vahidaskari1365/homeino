import { ArrowLeft, MapPin, Tag } from "lucide-react";

const ads = [
  { title: "مبل ال ۷ نفره", city: "تهران", price: "۱۲,۰۰۰,۰۰۰", condition: "در حد نو" },
  { title: "فرش دست‌بافت ۱۲ متری", city: "اصفهان", price: "۸,۵۰۰,۰۰۰", condition: "سالم" },
  { title: "لوستر کریستال ۱۲ شاخه", city: "شیراز", price: "۴,۲۰۰,۰۰۰", condition: "در حد نو" },
  { title: "تخت خواب دو نفره چوبی", city: "تبریز", price: "۶,۸۰۰,۰۰۰", condition: "سالم" },
];

const SecondHandSection = () => {
  return (
    <section id="secondhand" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-gold text-sm font-medium tracking-wider">آگهی دست دوم</span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3">
              بخرید، بفروشید
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg">
              لوازم دست دوم خانه خود را بفروشید یا با قیمت مناسب خرید کنید
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button className="gradient-gold text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
              ثبت آگهی رایگان
              <ArrowLeft size={16} />
            </button>
            <a href="#" className="flex items-center gap-2 text-gold border border-gold/30 px-6 py-3 rounded-xl text-sm font-medium hover:bg-gold/5 transition-colors">
              مشاهده همه آگهی‌ها
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ads.map((ad, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-card border border-border hover:border-gold/30 hover:shadow-card cursor-pointer transition-all duration-300"
            >
              <div className="w-full h-40 rounded-xl bg-muted mb-4 flex items-center justify-center">
                <Tag size={32} className="text-muted-foreground/30" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{ad.title}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <MapPin size={14} />
                {ad.city}
              </div>
              <div className="text-xs text-emerald-light mb-3">{ad.condition}</div>
              <div className="text-gold font-bold">{ad.price} تومان</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecondHandSection;
