import { ArrowLeft, Package } from "lucide-react";
import heroImg from "@/assets/hero-living.jpg";
import classicImg from "@/assets/inspiration-classic.jpg";
import bedroomImg from "@/assets/inspiration-bedroom.jpg";
import OptimizedImage from "./OptimizedImage";

const sets = [
  {
    image: heroImg,
    title: "ست کامل پذیرایی مدرن",
    items: ["مبل راحتی", "فرش مدرن", "میز جلو مبلی", "لوستر", "پرده", "تابلو"],
    totalPrice: "۴۵,۰۰۰,۰۰۰",
    discount: "۳۸,۵۰۰,۰۰۰",
  },
  {
    image: classicImg,
    title: "ست کلاسیک پذیرایی",
    items: ["مبل کلاسیک", "فرش ابریشم", "لوستر کریستال", "پرده کلاسیک", "تابلو نقاشی"],
    totalPrice: "۷۸,۰۰۰,۰۰۰",
    discount: "۶۵,۰۰۰,۰۰۰",
  },
  {
    image: bedroomImg,
    title: "ست اتاق خواب مدرن",
    items: ["تخت دو نفره", "پاتختی", "کمد", "آباژور", "فرش", "پرده"],
    totalPrice: "۳۲,۰۰۰,۰۰۰",
    discount: "۲۷,۵۰۰,۰۰۰",
  },
];

const CompleteSetsSection = () => {
  return (
    <section id="complete-sets" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <Package size={18} className="text-gold" />
              <span className="text-gold text-sm font-medium">ست‌های کامل</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              دکوراسیون کامل، یک‌جا
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg">
              ست‌های آماده دکوراسیون با قیمت ویژه — انتخاب آسان، ظاهر حرفه‌ای
            </p>
          </div>
          <a href="#" className="flex items-center gap-2 text-gold hover:gap-3 transition-all mt-4 md:mt-0">
            مشاهده همه ست‌ها
            <ArrowLeft size={18} />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sets.map((set, idx) => (
            <div key={idx} className="group rounded-2xl overflow-hidden bg-card border border-border hover:border-gold/30 hover:shadow-luxury transition-all duration-500">
              <div className="relative overflow-hidden h-64">
                <OptimizedImage
                  src={set.image}
                  alt={set.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 right-4 bg-destructive text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  تخفیف ویژه
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">{set.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {set.items.map((item) => (
                    <span key={item} className="text-xs bg-accent text-muted-foreground px-3 py-1 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <div className="text-sm text-muted-foreground line-through">{set.totalPrice} تومان</div>
                    <div className="text-lg font-bold text-gold">{set.discount} تومان</div>
                  </div>
                  <button className="gradient-gold text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                    مشاهده ست
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CompleteSetsSection;
