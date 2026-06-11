import { ArrowLeft, Eye } from "lucide-react";
import bedroomImg from "@/assets/inspiration-bedroom.jpg";
import kitchenImg from "@/assets/inspiration-kitchen.jpg";
import classicImg from "@/assets/inspiration-classic.jpg";
import bathroomImg from "@/assets/inspiration-bathroom.jpg";

const styles = ["همه", "مدرن", "کلاسیک", "مینیمال", "لوکس", "سنتی"];

const inspirations = [
  {
    image: classicImg,
    title: "پذیرایی کلاسیک با فرش دست‌بافت",
    style: "کلاسیک",
    products: ["مبل کلاسیک", "فرش ابریشم", "لوستر کریستال"],
    large: true,
  },
  {
    image: bedroomImg,
    title: "اتاق خواب مدرن و آرام",
    style: "مدرن",
    products: ["تخت مدرن", "آباژور", "فرش مینیمال"],
    large: false,
  },
  {
    image: kitchenImg,
    title: "آشپزخانه شیک با جزئیات طلایی",
    style: "مینیمال",
    products: ["کابینت سفید", "شیرآلات طلایی", "لوستر آویز"],
    large: false,
  },
  {
    image: bathroomImg,
    title: "حمام لوکس با سنگ مرمر",
    style: "لوکس",
    products: ["وان آزاد", "شیرآلات طلایی", "سنگ مرمر"],
    large: false,
  },
];

const InspirationSection = () => {
  return (
    <section id="inspiration" className="py-24 bg-cream-dark">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-gold text-sm font-medium tracking-wider">الهام دکوراسیون</span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3">
              ایده بگیرید، خلق کنید
            </h2>
          </div>
          <a href="#" className="flex items-center gap-2 text-gold hover:gap-3 transition-all mt-4 md:mt-0">
            <span>مشاهده همه</span>
            <ArrowLeft size={18} />
          </a>
        </div>

        {/* Style Filters */}
        <div className="flex flex-wrap gap-3 mb-10">
          {styles.map((style, i) => (
            <button
              key={style}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                i === 0
                  ? "gradient-gold text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:border-gold/30 hover:text-gold"
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inspirations.map((item, idx) => (
            <div
              key={idx}
              className={`group relative overflow-hidden rounded-2xl cursor-pointer ${
                item.large ? "md:col-span-2 md:row-span-2" : ""
              }`}
            >
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                  item.large ? "h-[500px] md:h-full" : "h-[300px]"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent" />

              {/* Style Badge */}
              <div className="absolute top-4 right-4 bg-gold/20 backdrop-blur-sm border border-gold/30 text-gold px-3 py-1 rounded-full text-xs font-medium">
                {item.style}
              </div>

              {/* View Icon */}
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
                  <Eye size={18} className="text-primary-foreground" />
                </div>
              </div>

              {/* Info */}
              <div className="absolute bottom-0 right-0 left-0 p-6">
                <h3 className="text-primary-foreground text-lg font-bold mb-2">{item.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {item.products.map((p) => (
                    <span key={p} className="bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground/80 text-xs px-3 py-1 rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InspirationSection;
