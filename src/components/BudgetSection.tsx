import { Calculator, ArrowLeft } from "lucide-react";

const BudgetSection = () => {
  return (
    <section className="py-24 bg-cream-dark">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-5 py-2 mb-6">
            <Calculator size={16} className="text-gold" />
            <span className="text-gold text-sm font-medium">بودجه‌بندی هوشمند</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            بودجه‌تان را وارد کنید
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
            بودجه مورد نظر خود را مشخص کنید تا بهترین محصولات و ست‌های مناسب را به شما پیشنهاد دهیم
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 max-w-xl mx-auto">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder="مثال: ۵۰,۰۰۰,۰۰۰ تومان"
                className="w-full bg-card border border-border rounded-xl px-6 py-4 text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <button className="gradient-gold text-primary-foreground px-8 py-4 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap">
              پیشنهاد بگیرید
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BudgetSection;
