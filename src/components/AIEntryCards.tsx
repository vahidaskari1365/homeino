import { Wand2, Search, Sparkles } from "lucide-react";

interface AIEntryCardsProps {
  onStartDesign: () => void;
  onStartInspiration: () => void;
  onStartSuggest: () => void;
}

const cards = [
  {
    icon: Wand2,
    title: "طراحی خانه من",
    description: "عکس خانه خودت را آپلود کن و با محصولات هومینو دکور کن.",
    button: "شروع طراحی",
    action: "onStartDesign" as const,
    gradient: "from-accent/20 to-accent/5",
    border: "border-accent/20 hover:border-accent/40",
    iconBg: "bg-accent/10 text-accent",
  },
  {
    icon: Search,
    title: "جستجوی بصری الهام",
    description: "یک اسکرین‌شات از پینترست، اینستاگرام یا هر سایتی آپلود کن. AI تک‌تک اشیاء را تشخیص می‌دهد و محصولات مشابه هومینو را پیدا می‌کند.",
    button: "یافتن محصولات مشابه",
    action: "onStartInspiration" as const,
    gradient: "from-gold/20 to-gold/5",
    border: "border-gold/20 hover:border-gold/40",
    iconBg: "bg-gold/10 text-gold",
  },
  {
    icon: Sparkles,
    title: "پیشنهادات هومینو استودیو",
    description: "بگذار AI هومینو بهترین مبلمان و دکوراسیون را بر اساس نوع فضا، بودجه و سبک تو پیشنهاد کند.",
    button: "دریافت پیشنهاد",
    action: "onStartSuggest" as const,
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/10 text-emerald-500",
  },
];

const AIEntryCards = ({ onStartDesign, onStartInspiration, onStartSuggest }: AIEntryCardsProps) => {
  const handlers: Record<string, () => void> = {
    onStartDesign,
    onStartInspiration,
    onStartSuggest,
  };

  return (
    <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.title}
            onClick={handlers[card.action]}
            className={`group relative text-right rounded-2xl border p-6 transition-all duration-300 bg-gradient-to-b ${card.gradient} ${card.border} hover:shadow-lg hover:-translate-y-0.5`}
          >
            <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Icon size={22} />
            </div>
            <h3 className="font-bold text-lg mb-2">{card.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{card.description}</p>
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-all bg-background/80 border border-border group-hover:bg-foreground group-hover:text-background group-hover:border-foreground`}>
              {Icon === Wand2 && <Wand2 size={12} />}
              {Icon === Search && <Search size={12} />}
              {Icon === Sparkles && <Sparkles size={12} />}
              {card.button}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AIEntryCards;
