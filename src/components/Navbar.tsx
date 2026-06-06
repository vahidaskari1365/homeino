import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X, User, Heart, LogOut, LayoutDashboard, ShieldCheck, Tag, Sparkles, CalendarCheck, Palette } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import CartButton from "./CartButton";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import type { Session } from "@supabase/supabase-js";
import logo from "@/assets/homeino-logo.jpg";

const navLinks = [
  { label: "خانه", href: "#" },
  { label: "دسته‌بندی‌ها", href: "#categories" },
  { label: "الهام دکوراسیون", href: "#inspiration" },
  { label: "طراحی با هوش مصنوعی", href: "/ai-design" },
  { label: "فروشگاه‌ها", href: "/shops" },
  { label: "آگهی دست دوم", href: "#secondhand" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const { isModerator } = useAdminRole();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <img src={logo} alt="Homeino" className="h-10 w-10 rounded-lg object-cover" />
          <span className="text-2xl font-display text-gold font-bold tracking-wide">هومینو</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-muted-foreground hover:text-gold transition-colors duration-300 text-sm font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4">
          
          <button className="text-muted-foreground hover:text-gold transition-colors">
            <Search size={20} />
          </button>
          <Link to="/wishlist" className="text-muted-foreground hover:text-gold transition-colors hidden sm:block" title="علاقه‌مندی‌ها">
            <Heart size={20} />
          </Link>
          <Link to="/quotes" className="text-muted-foreground hover:text-gold transition-colors hidden sm:block" title="درخواست‌های قیمت">
            <Tag size={20} />
          </Link>
          <Link to="/consultations" className="text-muted-foreground hover:text-gold transition-colors hidden sm:block" title="مشاوره دکوراسیون">
            <Sparkles size={20} />
          </Link>
          <Link to="/site-visits" className="text-muted-foreground hover:text-gold transition-colors hidden sm:block" title="رزرو بازدید حضوری">
            <CalendarCheck size={20} />
          </Link>
          <Link to="/designers" className="text-muted-foreground hover:text-gold transition-colors hidden sm:block" title="طراحان داخلی">
            <Palette size={20} />
          </Link>
          <CartButton />
          {session ? (
            <>
              {isModerator && (
                <Link
                  to="/admin"
                  className="text-gold hover:text-gold/80 transition-colors hidden sm:flex items-center gap-2 text-sm"
                  title="پنل مدیریت"
                >
                  <ShieldCheck size={20} />
                  <span className="hidden md:inline">مدیریت</span>
                </Link>
              )}
              <Link
                to="/dashboard"
                className="text-muted-foreground hover:text-gold transition-colors hidden sm:flex items-center gap-2 text-sm"
                title="داشبورد"
              >
                <LayoutDashboard size={20} />
                <span className="hidden md:inline">داشبورد</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-gold transition-colors hidden sm:block"
                title="خروج"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="text-muted-foreground hover:text-gold transition-colors hidden sm:flex items-center gap-2 text-sm"
            >
              <User size={20} />
              <span>ورود</span>
            </Link>
          )}
          <button className="lg:hidden text-muted-foreground" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-background border-t border-border py-6 px-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-3 text-muted-foreground hover:text-gold transition-colors text-base"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
