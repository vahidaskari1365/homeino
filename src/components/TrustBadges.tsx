import { Shield, Truck, RotateCcw, Headphones, Lock, Award } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "ضمانت اصالت",
    desc: "۱۰۰٪ کالای اورجینال از تولیدکنندگان معتبر",
  },
  {
    icon: Truck,
    title: "ارسال سریع",
    desc: "تحویل ۲۴ تا ۷۲ ساعته در تهران و شهرستان",
  },
  {
    icon: RotateCcw,
    title: "۷ روز ضمانت بازگشت",
    desc: "بازگشت بدون قید و شرط تا ۷ روز",
  },
  {
    icon: Headphones,
    title: "پشتیبانی ۲۴/۷",
    desc: "مشاوره رایگان در هر ساعت از شبانه‌روز",
  },
  {
    icon: Lock,
    title: "پرداخت امن",
    desc: "درگاه پرداخت معتبر با SSL رمزنگاری",
  },
  {
    icon: Award,
    title: "گارانتی معتبر",
    desc: "گارانتی اصلی تمام محصولات",
  },
];

const TrustBadges = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div
                key={idx}
                className="text-center p-4 rounded-xl hover:bg-muted/50 transition-colors group"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-gold/10 flex items-center justify-center mb-3 group-hover:bg-gold/20 transition-colors">
                  <Icon size={24} className="text-gold" />
                </div>
                <h4 className="font-bold text-foreground text-sm mb-1">
                  {badge.title}
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {badge.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
