import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Wallet, Palette, Users, Dog, Heart, ArrowLeft, ShoppingBag,
  Home, Star, Loader2, CheckCircle, TrendingUp, BadgePercent, Store,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const STYLES = [
  { id: "modern", label: "مدرن", icon: "🏠" },
  { id: "classic", label: "کلاسیک", icon: "🏛️" },
  { id: "minimalist", label: "مینیمال", icon: "◻️" },
  { id: "industrial", label: "صنعتی", icon: "🏭" },
  { id: "scandinavian", label: "اسکاندیناوی", icon: "❄️" },
  { id: "luxury", label: "لوکس", icon: "💎" },
  { id: "bohemian", label: "بوهمی", icon: "🌿" },
  { id: "japanese", label: "ژاپنی", icon: "🎋" },
];

const SIZES = [
  { id: "small", label: "کوچک (زیر ۵۰ متر)", icon: "📏" },
  { id: "medium", label: "متوسط (۵۰-۱۰۰ متر)", icon: "📐" },
  { id: "large", label: "بزرگ (۱۰۰-۲۰۰ متر)", icon: "🏠" },
  { id: "mansion", label: "بسیار بزرگ (بالای ۲۰۰ متر)", icon: "🏰" },
];

const PRIORITIES = [
  { id: "price", label: "قیمت مناسب", icon: "💰", desc: "کیفیت قابل قبول با بهترین قیمت" },
  { id: "balanced", label: "متعادل", icon: "⚖️", desc: "ترکیب مناسبی از قیمت و کیفیت" },
  { id: "quality", label: "کیفیت بالا", icon: "💎", desc: "بهترین کیفیت بدون توجه به قیمت" },
];

const COLORS = [
  { id: "white", label: "سفید", hex: "#ffffff" },
  { id: "cream", label: "کرم", hex: "#f5f0e8" },
  { id: "beige", label: "بژ", hex: "#d4c5a9" },
  { id: "brown", label: "قهوه‌ای", hex: "#8b6914" },
  { id: "gray", label: "خاکستری", hex: "#808080" },
  { id: "black", label: "مشکی", hex: "#1a1a1a" },
  { id: "blue", label: "آبی", hex: "#1e40af" },
  { id: "navy", label: "سرمه‌ای", hex: "#0f172a" },
  { id: "green", label: "سبز", hex: "#166534" },
  { id: "emerald", label: "زمردی", hex: "#047857" },
  { id: "red", label: "قرمز", hex: "#991b1b" },
  { id: "gold", label: "طلایی", hex: "#b8860b" },
];

const fmt = (n: number) => n.toLocaleString("fa-IR") + " تومان";

interface Recommendation {
  id: string;
  name: string;
  desc: string;
  image: string;
  products: { name: string; price: number; store: string; image: string }[];
  totalCost: number;
  focus: string;
}

const AIAdvisor = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState("");
  const [style, setStyle] = useState("");
  const [size, setSize] = useState("");
  const [familyMembers, setFamilyMembers] = useState("");
  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [favColors, setFavColors] = useState<string[]>([]);
  const [priority, setPriority] = useState("");
  const [generating, setGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const numericBudget = useMemo(() => {
    const parsed = Number(budget.replace(/,/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }, [budget]);

  const toggleColor = (colorId: string) => {
    setFavColors((prev) =>
      prev.includes(colorId) ? prev.filter((c) => c !== colorId) : [...prev, colorId],
    );
  };

  const isFormValid = budget && style && size && priority;

  const generateRecommendations = () => {
    if (!isFormValid) return;
    setGenerating(true);

    setTimeout(() => {
      const styleLabel = STYLES.find((s) => s.id === style)?.label || "";

      const results: Recommendation[] = [
        {
          id: "rec-1",
          name: `چیدمان ${styleLabel} مقرون‌به‌صرفه`,
          desc: "ترکیبی از محصولات اقتصادی با حفظ سبک و کیفیت مناسب",
          image: "https://picsum.photos/seed/rec1/600/400",
          products: [
            { name: "مبل راحتی سه نفره", price: 12500000, store: "مبل شاپ سنتر", image: "https://picsum.photos/seed/r1p1/100/100" },
            { name: "میز عسلی ام‌دی‌اف", price: 1800000, store: "چوب‌آرایان", image: "https://picsum.photos/seed/r1p2/100/100" },
            { name: "فرش ماشینی ۶ متری", price: 4500000, store: "فرش هیراد", image: "https://picsum.photos/seed/r1p3/100/100" },
            { name: "آباژور ایستاده ساده", price: 1200000, store: "نورگان", image: "https://picsum.photos/seed/r1p4/100/100" },
          ],
          totalCost: 20000000,
          focus: "قیمت مناسب",
        },
        {
          id: "rec-2",
          name: `چیدمان ${styleLabel} متعادل`,
          desc: "ترکیب بهینه‌ای از محصولات با کیفیت و قیمت مناسب",
          image: "https://picsum.photos/seed/rec2/600/400",
          products: [
            { name: "مبل شیک پارچه‌ای", price: 18500000, store: "دکوراسیون مدرن", image: "https://picsum.photos/seed/r2p1/100/100" },
            { name: "میز عسلی چوب گردو", price: 4200000, store: "چوب‌آرایان", image: "https://picsum.photos/seed/r2p2/100/100" },
            { name: "فرش دستبافت نیمه‌ابریشم", price: 15000000, store: "قالی‌سرای ایرانیان", image: "https://picsum.photos/seed/r2p3/100/100" },
            { name: "لوستر مدرن ۵ شاخه", price: 3500000, store: "نورگان", image: "https://picsum.photos/seed/r2p4/100/100" },
          ],
          totalCost: 41200000,
          focus: "قیمت و کیفیت",
        },
        {
          id: "rec-3",
          name: `چیدمان ${styleLabel} لوکس`,
          desc: "محصولات لوکس و باکیفیت برای فضایی بی‌نظیر",
          image: "https://picsum.photos/seed/rec3/600/400",
          products: [
            { name: "مبل سلطنتی چرم", price: 35000000, store: "مبلمان پارس", image: "https://picsum.photos/seed/r3p1/100/100" },
            { name: "میز عسلی مرمر", price: 12000000, store: "دکوراسیون لوکس", image: "https://picsum.photos/seed/r3p2/100/100" },
            { name: "فرش دستبافت ابریشم", price: 32000000, store: "قالی‌سرای ایرانیان", image: "https://picsum.photos/seed/r3p3/100/100" },
            { name: "لوستر کریستالی", price: 8500000, store: "نورگان", image: "https://picsum.photos/seed/r3p4/100/100" },
          ],
          totalCost: 87500000,
          focus: "کیفیت بالا",
        },
      ];

      setRecommendations(results);
      setGenerating(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      <main className="container mx-auto px-4 md:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> بازگشت
          </button>
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-3">
            <Sparkles size={14} className="text-accent" />
            <span className="text-accent text-xs font-bold">مشاور خرید هوش مصنوعی</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold">مشاور خرید هوشمند</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
            با وارد کردن اطلاعات زیر، سه پیشنهاد خرید هوشمند بر اساس نیازهای شما دریافت کنید
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles size={18} className="text-accent" />
                  اطلاعات مورد نیاز
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Budget */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                    <Wallet size={16} className="text-accent" />
                    بودجه مورد نظر
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={budget ? Number(budget).toLocaleString("fa-IR") : ""}
                    onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
                    className="h-11 rounded-xl text-left font-bold"
                  />
                </div>

                {/* Style */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                    <Palette size={16} className="text-accent" />
                    سبک دکوراسیون مورد علاقه
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                          style === s.id
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-card text-muted-foreground hover:border-accent/50",
                        )}
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* House Size */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                    <Home size={16} className="text-accent" />
                    متراژ خانه
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSize(s.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                          size === s.id
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-card text-muted-foreground hover:border-accent/50",
                        )}
                      >
                        <span>{s.icon}</span>
                        <span className="text-xs">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Family Members */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                    <Users size={16} className="text-accent" />
                    تعداد اعضای خانواده
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={familyMembers}
                    onChange={(e) => setFamilyMembers(e.target.value)}
                    placeholder="مثلاً ۴"
                    className="h-11 rounded-xl"
                  />
                </div>

                {/* Children & Pets */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setHasChildren(!hasChildren)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      hasChildren
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card text-muted-foreground hover:border-accent/50",
                    )}
                  >
                    <Heart size={16} />
                    <span>{hasChildren ? "دارای کودک" : "بدون کودک"}</span>
                    {hasChildren && <CheckCircle size={14} className="mr-auto" />}
                  </button>
                  <button
                    onClick={() => setHasPets(!hasPets)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      hasPets
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card text-muted-foreground hover:border-accent/50",
                    )}
                  >
                    <Dog size={16} />
                    <span>{hasPets ? "دارای حیوان" : "بدون حیوان"}</span>
                    {hasPets && <CheckCircle size={14} className="mr-auto" />}
                  </button>
                </div>

                {/* Favorite Colors */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                    <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                    رنگ‌های مورد علاقه
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => toggleColor(c.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-all",
                          favColors.includes(c.id)
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-card text-muted-foreground hover:border-accent/50",
                        )}
                      >
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                    <Star size={16} className="text-accent" />
                    اولویت قیمت در برابر کیفیت
                  </label>
                  <div className="flex flex-col gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPriority(p.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all text-right",
                          priority === p.id
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-card text-muted-foreground hover:border-accent/50",
                        )}
                      >
                        <span className="text-lg">{p.icon}</span>
                        <div>
                          <div className="font-bold">{p.label}</div>
                          <div className="text-[10px] opacity-70">{p.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={generateRecommendations}
                  disabled={!isFormValid || generating}
                  className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-bold text-base shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all"
                >
                  {generating ? (
                    <><Loader2 className="animate-spin ml-2" size={18} /> در حال تحلیل...</>
                  ) : (
                    <><Sparkles size={18} className="ml-2" /> دریافت پیشنهادات خرید</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Recommendations */}
          <div className="lg:col-span-3 space-y-6">
            {generating && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-accent mb-4" size={48} />
                <p className="text-lg font-bold text-foreground mb-1">در حال تحلیل اطلاعات...</p>
                <p className="text-sm text-muted-foreground">هوش مصنوعی در حال محاسبه بهترین گزینه‌ها برای شماست</p>
                <div className="mt-6 flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-16 rounded-full bg-muted animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {!generating && recommendations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Sparkles className="text-muted-foreground mb-4" size={64} />
                <h3 className="text-lg font-bold text-foreground mb-2">هنوز پیشنهادی دریافت نکرده‌اید</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  اطلاعات مورد نیاز را در بخش سمت راست وارد کنید و روی دکمه «دریافت پیشنهادات خرید» کلیک کنید
                </p>
              </div>
            )}

            {!generating && recommendations.map((rec, idx) => (
              <Card
                key={rec.id}
                className="overflow-hidden border-border/60 shadow-sm transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                {/* Header with image */}
                <div className="relative">
                  <img
                    src={rec.image}
                    alt={rec.name}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 right-4 left-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="bg-accent/90 text-accent-foreground border-0 text-[10px]">
                        پیشنهاد {idx + 1}
                      </Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px] backdrop-blur-sm">
                        {rec.focus}
                      </Badge>
                    </div>
                    <h3 className="text-white font-bold text-lg">{rec.name}</h3>
                    <p className="text-white/80 text-xs">{rec.desc}</p>
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* Products */}
                  <div className="space-y-2">
                    {rec.products.map((p, pi) => (
                      <div key={pi} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-2">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold line-clamp-1">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Store size={10} />
                            <span>{p.store}</span>
                          </div>
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold text-accent">
                          {fmt(p.price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={16} className="text-accent" />
                      <span className="text-sm font-bold">هزینه کل پیشنهاد</span>
                    </div>
                    <span className="text-lg font-bold text-accent">{fmt(rec.totalCost)}</span>
                  </div>

                  {/* Budget comparison */}
                  {numericBudget > 0 && (
                    <div className={cn(
                      "flex items-center justify-between rounded-lg p-2 text-xs font-medium",
                      rec.totalCost <= numericBudget
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
                    )}>
                      {rec.totalCost <= numericBudget ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle size={12} /> در محدوده بودجه شما
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} /> {fmt(rec.totalCost - numericBudget)} بیشتر از بودجه
                        </span>
                      )}
                      <span>بودجه: {fmt(numericBudget)}</span>
                    </div>
                  )}

                  {/* CTA */}
                  <Button className="w-full rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-all">
                    <ShoppingBag size={16} className="ml-2" />
                    انتخاب این پیشنهاد
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIAdvisor;