import { Upload, Wand2, ShoppingCart, Save, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Upload,
    step: "۱",
    title: "عکس خانه‌تان را ارسال کنید",
    desc: "تصویری از فضای مورد نظر خود آپلود کنید",
  },
  {
    icon: Wand2,
    step: "۲",
    title: "وسایل را انتخاب و جایگذاری کنید",
    desc: "مبل، فرش، پرده، لوستر و ... را در فضا قرار دهید",
  },
  {
    icon: ShoppingCart,
    step: "۳",
    title: "لیست قیمت و خرید دریافت کنید",
    desc: "قیمت هر محصول و مجموع را مشاهده و خرید کنید",
  },
  {
    icon: Save,
    step: "۴",
    title: "طراحی را ذخیره یا ارسال کنید",
    desc: "طرح خود را ذخیره کرده یا برای مشاوره ارسال کنید",
  },
];

const AIDesignSection = () => {
  return (
    <section id="ai-design" className="py-24 bg-charcoal relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-brand/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-5 py-2 mb-6">
            <Wand2 size={16} className="text-gold" />
            <span className="text-gold text-sm font-medium">هوش مصنوعی</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mt-3">
            خانه‌تان را با
            <span className="text-gold"> هوش مصنوعی </span>
            طراحی کنید
          </h2>
          <p className="text-cream/60 mt-4 max-w-2xl mx-auto text-lg">
            عکس خانه خود را ارسال کنید، وسایل دلخواه را انتخاب کنید و طراحی رویایی‌تان را ببینید
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.step} className="relative group">
                <div className="p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 hover:border-gold/30 transition-all duration-500">
                  <div className="text-gold/30 text-5xl font-display font-bold absolute top-4 left-4">
                    {step.step}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mb-6">
                    <Icon size={26} className="text-gold" />
                  </div>
                  <h3 className="text-primary-foreground font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-cream/50 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            to="/ai-design"
            className="gradient-gold text-primary-foreground px-10 py-4 rounded-xl font-medium text-lg shadow-luxury hover:opacity-90 transition-all inline-flex items-center gap-3"
          >
            شروع طراحی
            <ArrowLeft size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AIDesignSection;
