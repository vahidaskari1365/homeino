import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X, User, Heart, LogOut, LayoutDashboard, ShieldCheck, Tag, Sparkles, CalendarCheck, Palette } from "lucide-react";

import CartButton from "./CartButton";
import NotificationBell from "./NotificationBell";
import SearchDialog from "./SearchDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import type { Session } from "@supabase/supabase-js";
import logo from "@/assets/homeino-logo.jpg";

const navLinks = [
  { label: "خانه", href: "/" },
  { label: "دسته‌بندی‌ها", href: "/#categories" },
  { label: "جستجوی بصری", href: "/inspiration-search" },
  { label: "الهام دکوراسیون", href: "/inspirations" },
  { label: "طراحی با هوش مصنوعی", href: "/ai-design" },
  { label: "فروشگاه‌ها", href: "/shops" },
  { label: "آگهی دست دوم", href: "/second-hand" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
    <nav className="fixed top-4 right-4 left-4 md:right-8 md:left-8 z-50 rounded-2xl bg-background/75 backdrop-blur-xl border border-white/10 shadow-luxury transition-all duration-500 mx-auto max-w-7xl">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <img src={logo} alt="Homeino" className="h-10 w-10 rounded-lg object-cover" />
          <span className="text-2xl font-display text-gold font-bold tracking-wide">هومینو</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-muted-foreground hover:text-gold transition-colors duration-300 text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4">
          
          <button onClick={() => setSearchOpen(true)} className="text-muted-foreground hover:text-gold transition-colors" title="جستجو">
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
          {session && <NotificationBell />}
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
            <Link
              key={link.label}
              to={link.href}
              className="block py-3 text-muted-foreground hover:text-gold transition-colors text-base"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
};

export default Navbar;
