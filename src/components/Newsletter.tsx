import { useState } from "react";
import { Mail, ArrowLeft, Gift, Bell } from "lucide-react";
import { toast } from "sonner";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("لطفاً ایمیل معتبر وارد کنید");
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    toast.success("عضویت موفق! کد تخفیف به ایمیلتان ارسال شد 🎉");
    setEmail("");
  };

  return (
    <section className="py-20 bg-charcoal relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/30 rounded-full px-4 py-2 mb-6">
            <Gift size={16} className="text-gold" />
            <span className="text-gold text-sm font-medium">
              هدیه ویژه برای اعضا
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground mb-4">
            ۲۰٪ تخفیف اولین خرید شما
          </h2>
          <p className="text-primary-foreground/60 mb-8 max-w-xl mx-auto">
            در خبرنامه هومینو عضو شوید تا از جدیدترین تخفیف‌ها، ایده‌های دکوراسیون
            و محصولات جدید مطلع شوید.
          </p>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Mail
                  size={20}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-foreground/40"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ایمیل خود را وارد کنید..."
                  className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-xl pr-12 pl-4 py-4 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-gold/50 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="gradient-gold text-charcoal px-6 py-4 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  "..."
                ) : (
                  <>
                    عضویت
                    <ArrowLeft size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-primary-foreground/30 text-xs mt-4 flex items-center justify-center gap-2">
            <Bell size={12} />
            می‌توانید هر زمان لغو اشتراک کنید. ما اسپم ارسال نمی‌کنیم.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
