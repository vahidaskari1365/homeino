import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gold/10 flex items-center justify-center">
            <Search size={40} className="text-gold" />
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-4">۴۰۴</h1>
          <h2 className="text-2xl font-bold text-foreground mb-3">صفحه مورد نظر یافت نشد</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="gradient-gold text-charcoal px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Home size={18} />
              بازگشت به صفحه اصلی
            </Link>
            <Link
              to="/shops"
              className="bg-card border border-border text-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-gold/30 transition-colors"
            >
              <ArrowLeft size={18} />
              مشاهده فروشگاه‌ها
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
