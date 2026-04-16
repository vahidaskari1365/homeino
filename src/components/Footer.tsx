import { Phone, Mail, MapPin, Globe } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-charcoal pt-20 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-display text-gold font-bold mb-4">خانه‌زیبا</h3>
            <p className="text-cream/50 text-sm leading-relaxed mb-6">
              مرجع تخصصی دکوراسیون و لوازم خانه. از الهام گرفتن تا خرید و تجهیز کامل خانه.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center text-cream/50 hover:text-gold hover:border-gold/30 transition-all">
                <Globe size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center text-cream/50 hover:text-gold hover:border-gold/30 transition-all">
                <Phone size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center text-cream/50 hover:text-gold hover:border-gold/30 transition-all">
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-primary-foreground font-bold mb-4">دسته‌بندی‌ها</h4>
            {["مبلمان", "فرش و قالی", "لوستر و روشنایی", "پرده", "کالای خواب", "دکور چوبی"].map((item) => (
              <a key={item} href="#" className="block text-cream/50 text-sm hover:text-gold transition-colors py-1.5">
                {item}
              </a>
            ))}
          </div>

          <div>
            <h4 className="text-primary-foreground font-bold mb-4">خدمات</h4>
            {["طراحی با هوش مصنوعی", "ست‌های کامل دکوراسیون", "مشاوره رایگان", "آگهی دست دوم", "نصب و اجرا"].map((item) => (
              <a key={item} href="#" className="block text-cream/50 text-sm hover:text-gold transition-colors py-1.5">
                {item}
              </a>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-primary-foreground font-bold mb-4">تماس با ما</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-cream/50 text-sm">
                <Phone size={16} className="text-gold" />
                ۰۲۱-۱۲۳۴۵۶۷۸
              </div>
              <div className="flex items-center gap-3 text-cream/50 text-sm">
                <Mail size={16} className="text-gold" />
                info@khaneziba.ir
              </div>
              <div className="flex items-start gap-3 text-cream/50 text-sm">
                <MapPin size={16} className="text-gold mt-1 shrink-0" />
                تهران، خیابان ولیعصر
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 text-center">
          <p className="text-cream/30 text-sm">
            © ۱۴۰۴ خانه‌زیبا. تمامی حقوق محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
