import { useState } from "react";
import { Search, Menu, X, User, ShoppingBag, Heart } from "lucide-react";

const navLinks = [
  { label: "خانه", href: "#" },
  { label: "دسته‌بندی‌ها", href: "#categories" },
  { label: "الهام دکوراسیون", href: "#inspiration" },
  { label: "طراحی با هوش مصنوعی", href: "#ai-design" },
  { label: "فروشگاه‌ها", href: "#stores" },
  { label: "آگهی دست دوم", href: "#secondhand" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-charcoal/95 backdrop-blur-md border-b border-gold/10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <span className="text-2xl font-display text-gold font-bold tracking-wide">خانه‌زیبا</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-cream/80 hover:text-gold transition-colors duration-300 text-sm font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <button className="text-cream/70 hover:text-gold transition-colors">
            <Search size={20} />
          </button>
          <button className="text-cream/70 hover:text-gold transition-colors hidden sm:block">
            <Heart size={20} />
          </button>
          <button className="text-cream/70 hover:text-gold transition-colors hidden sm:block">
            <ShoppingBag size={20} />
          </button>
          <button className="text-cream/70 hover:text-gold transition-colors hidden sm:block">
            <User size={20} />
          </button>
          <button className="lg:hidden text-cream/70" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-charcoal border-t border-gold/10 py-6 px-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-3 text-cream/80 hover:text-gold transition-colors text-base"
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
