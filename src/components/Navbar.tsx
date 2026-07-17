import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Menu, X, User, Heart, LogOut, LayoutDashboard, ShieldCheck, Tag,
  Sparkles, CalendarCheck, Palette, ChevronDown, Calculator, MapPin, Bell,
  Sofa, Briefcase,
} from "lucide-react";

import CartButton from "./CartButton";
import NotificationBell from "./NotificationBell";
import SearchDialog from "./SearchDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useWishlist } from "@/hooks/useWishlist";
import type { Session } from "@supabase/supabase-js";
import logo from "@/assets/homeino-logo.jpg";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryNavLinks = [
  { label: "خانه", href: "/" },
  { label: "هومینو استودیو (AI)", href: "/ai-design", highlight: true },
  { label: "فروشگاه‌ها", href: "/shops" },
  { label: "الهام‌بخش", href: "/inspirations" },
  { label: "آگهی دست دوم", href: "/second-hand" },
];

const servicesSubLinks = [
  { label: "مشاوره دکوراسیون", href: "/consultations", icon: Sparkles, desc: "درخواست مشاوره تخصصی از طراحان" },
  { label: "بازدید حضوری از محل", href: "/site-visits", icon: CalendarCheck, desc: "ثبت درخواست اندازه‌گیری و ساخت" },
  { label: "طراحان داخلی", href: "/designers", icon: Palette, desc: "رزومه و نمونه‌کارهای طراحان برتر" },
  { label: "استعلام قیمت سفارشی", href: "/quotes", icon: Tag, desc: "درخواست قیمت پروفرما از تولیدکنندگان" },
  { label: "برآورد هوشمند بودجه", href: "/budget-estimator", icon: Calculator, desc: "محاسبه دقیق هزینه دکوراسیون خانه" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const { isModerator } = useAdminRole();
  const { items: wishlistItems } = useWishlist();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-3 right-3 left-3 md:right-6 md:left-6 z-50 rounded-2xl bg-card/85 backdrop-blur-xl border border-emerald-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-300 mx-auto max-w-7xl" dir="rtl">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">

        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logo} alt="Homeino" className="h-9 w-9 rounded-xl object-cover border border-emerald-500/30 shadow-sm" />
          <div className="flex flex-col">
            <span className="text-xl font-black text-emerald-400 leading-tight">هومینو</span>
            <span className="text-[9px] text-muted-foreground font-semibold">Homeino Marketplace</span>
          </div>
        </Link>

        {/* Primary Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-6">
          {primaryNavLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={`text-xs font-bold transition-colors duration-200 flex items-center gap-1 ${
                link.highlight
                  ? "text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  : "text-muted-foreground hover:text-emerald-400"
              }`}
            >
              {link.highlight && <Sparkles size={13} className="text-emerald-400 animate-pulse" />}
              {link.label}
            </Link>
          ))}

          {/* Services Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-emerald-400 transition-colors outline-none">
              <span>خدمات دکوراسیون</span>
              <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl bg-card border-border shadow-2xl space-y-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">خدمات تخصصی هومینو</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {servicesSubLinks.map((sub) => {
                const Icon = sub.icon;
                return (
                  <DropdownMenuItem
                    key={sub.label}
                    onClick={() => navigate(sub.href)}
                    className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-emerald-500/10 focus:bg-emerald-500/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{sub.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{sub.desc}</p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Top Header Action Icons Bar */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
            title="جستجوی بصری و متنی"
          >
            <Search size={18} />
          </button>

          {/* Wishlist Button with Counter */}
          <Link
            to="/wishlist"
            className="relative w-9 h-9 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
            title="علاقه‌مندی‌ها"
          >
            <Heart size={18} />
            {wishlistItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow">
                {wishlistItems.length}
              </span>
            )}
          </Link>

          {/* Cart Button with Drawer */}
          <CartButton />

          {/* Notifications Bell (for authenticated users) */}
          {session && <NotificationBell />}

          {/* User Profile / Auth Account Dropdown */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 p-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all outline-none">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                  <User size={15} />
                </div>
                <ChevronDown size={14} className="hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl bg-card border-border shadow-2xl space-y-1">
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1 line-clamp-1">
                  {session.user.email || "حساب کاربری"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer gap-2 p-2 text-xs font-bold rounded-xl">
                  <User size={15} className="text-emerald-400" /> پروفایل کاربری
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer gap-2 p-2 text-xs font-bold rounded-xl">
                  <LayoutDashboard size={15} className="text-emerald-400" /> داشبورد پنل
                </DropdownMenuItem>

                {isModerator && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer gap-2 p-2 text-xs font-bold rounded-xl text-gold">
                    <ShieldCheck size={15} /> پنل مدیریت
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => navigate("/addresses")} className="cursor-pointer gap-2 p-2 text-xs font-bold rounded-xl">
                  <MapPin size={15} className="text-emerald-400" /> آدرس‌های ثبت‌شده
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate("/notification-preferences")} className="cursor-pointer gap-2 p-2 text-xs font-bold rounded-xl">
                  <Bell size={15} className="text-emerald-400" /> تنظیمات اطلاع‌رسانی
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer gap-2 p-2 text-xs font-bold rounded-xl text-destructive hover:bg-destructive/10">
                  <LogOut size={15} /> خروج از حساب
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-extrabold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              <User size={14} />
              <span>ورود / ثبت‌نام</span>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button className="lg:hidden p-2 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden bg-card border-t border-border py-4 px-6 rounded-b-2xl space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground">منوی اصلی</p>
            {primaryNavLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`block py-2 text-sm font-bold transition-colors ${
                  link.highlight ? "text-emerald-400" : "text-foreground hover:text-emerald-400"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground">خدمات دکوراسیون</p>
            <div className="grid grid-cols-2 gap-2">
              {servicesSubLinks.map((sub) => (
                <Link
                  key={sub.label}
                  to={sub.href}
                  className="p-2 rounded-xl bg-muted/40 border border-border text-xs font-bold text-foreground hover:text-emerald-400 hover:border-emerald-500/40 transition-all flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <sub.icon size={13} className="text-emerald-400 shrink-0" />
                  <span className="line-clamp-1">{sub.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
};

export default Navbar;
