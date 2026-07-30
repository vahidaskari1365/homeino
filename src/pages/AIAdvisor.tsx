import { useState, useMemo, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---- Types از دیتابیس واقعی ----
interface MarketplaceProduct {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  category_id: string | null;
  profile_id: string;
  stock: number;
}

interface MarketplaceStore {
  id: string;
  brand_name: string;
  city: string | null;
}

interface RecommendationProduct {
  id: string;
  name: string;
  price: number;
  store_name: string;
  profile_id: string;
  image_url: string;
  category: string;
}

interface Recommendation {
  id: string;
  name: string;
  desc: string;
  products: RecommendationProduct[];
  totalCost: number;
  focus: string;
}

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

  // ---- داده‌های واقعی از دیتابیس ----
  const [allProducts, setAllProducts] = useState<MarketplaceProduct[]>([]);
  const [stores, setStores] = useState<Record<string, MarketplaceStore>>({});
  const [categories, setCategories] = useState<Record<string, { name: string; slug: string }>>({});
  const [loadingData, setLoadingData] = useState(true);

  // بارگذاری محصولات واقعی از دیتابیس
  useEffect(() => {
    (async () => {
      try {
        setLoadingData(true);

        // دریافت دسته‌بندی‌ها
        const { data: cats } = await supabase
          .from("producer_categories")
          .select("id, name, slug");
        const catMap: Record<string, { name: string; slug: string }> = {};
        (cats || []).forEach((c) => { catMap[c.id] = c; });
        setCategories(catMap);

        // دریافت محصولات فعال از دیتابیس
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, image_url, category_id, profile_id, stock")
          .eq("is_active", true)
          .not("image_url", "is", null)
          .not("price", "is", null)
          .order("price", { ascending: true })
          .limit(200);

        setAllProducts((prods || []) as MarketplaceProduct[]);

        // دریافت اطلاعات فروشگاه‌ها
        const profileIds = [...new Set((prods || []).map((p) => p.profile_id))];
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, brand_name, city")
            .in("id", profileIds);

          const storeMap: Record<string, MarketplaceStore> = {};
          (profiles || []).forEach((s) => {
            storeMap[s.id] = s as MarketplaceStore;
          });
          setStores(storeMap);
        }
      } catch (e) {
        console.error("خطا در بارگذاری داده‌ها:", e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

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

  // ---- تولید پیشنهادات بر اساس محصولات واقعی بازار ----
  const generateRecommendations = () => {
    if (!isFormValid) return;

    if (allProducts.length === 0) {
      toast.error("متأسفانه محصولی در بازار موجود نیست. لطفاً بعداً مراجعه کنید.");
      return;
    }

    setGenerating(true);

    // شبیه‌سازی زمان تحلیل (همان UX قبلی)
    setTimeout(() => {
      try {
        const styleLabel = STYLES.find((s) => s.id === style)?.label || "";
        const budgetAmount = numericBudget;

        // مرتب‌سازی محصولات بر اساس قیمت
        const sortedByPrice = [...allProducts].sort((a, b) => (a.price || 0) - (b.price || 0));
        const totalProducts = sortedByPrice.length;

        // تقسیم محصولات به سه گروه قیمتی از داده‌های واقعی
        const third = Math.floor(totalProducts / 3);
        const cheapProducts = sortedByPrice.slice(0, third);
        const midProducts = sortedByPrice.slice(third, third * 2);
        const expensiveProducts = sortedByPrice.slice(third * 2);

        // انتخاب محصولات برای هر پیشنهاد
        const pickProducts = (
          pool: MarketplaceProduct[],
          count: number,
          targetBudget?: number
        ): RecommendationProduct[] => {
          const shuffled = [...pool].sort(() => Math.random() - 0.5);
          const picked: RecommendationProduct[] = [];
          let total = 0;

          for (const p of shuffled) {
            if (picked.length >= count) break;
            const price = Number(p.price) || 0;
            if (targetBudget && total + price > targetBudget && picked.length > 0) break;

            const catInfo = p.category_id ? categories[p.category_id] : null;
            const storeInfo = p.profile_id ? stores[p.profile_id] : null;

            picked.push({
              id: p.id,
              name: p.name,
              price: price,
              store_name: storeInfo?.brand_name || "فروشگاه",
              profile_id: p.profile_id,
              image_url: p.image_url || "",
              category: catInfo?.name || "عمومی",
            });
            total += price;
          }

          return picked;
        };

        // ---- سه پیشنهاد واقعی از محصولات بازار ----
        const results: Recommendation[] = [];

        // پیشنهاد اقتصادی: محصولات ارزان
        const ecoProducts = pickProducts(cheapProducts, 4, budgetAmount);
        if (ecoProducts.length > 0) {
          results.push({
            id: "rec-eco",
            name: `چیدمان ${styleLabel} مقرون‌به‌صرفه`,
            desc: "ترکیبی از محصولات اقتصادی با حفظ سبک و کیفیت مناسب",
            products: ecoProducts,
            totalCost: ecoProducts.reduce((s, p) => s + p.price, 0),
            focus: "قیمت مناسب",
          });
        }

        // پیشنهاد متعادل: محصولات میان‌قیمت
        const balancedProducts = pickProducts(midProducts, 4, budgetAmount);
        if (balancedProducts.length > 0) {
          results.push({
            id: "rec-balanced",
            name: `چیدمان ${styleLabel} متعادل`,
            desc: "ترکیب بهینه‌ای از محصولات با کیفیت و قیمت مناسب",
            products: balancedProducts,
            totalCost: balancedProducts.reduce((s, p) => s + p.price, 0),
            focus: "قیمت و کیفیت",
          });
        }

        // پیشنهاد لوکس: محصولات گران
        const luxProducts = pickProducts(expensiveProducts, 4, budgetAmount * 1.5);
        if (luxProducts.length > 0) {
          results.push({
            id: "rec-lux",
            name: `چیدمان ${styleLabel} لوکس`,
            desc: "محصولات لوکس و باکیفیت برای فضایی بی‌نظیر",
            products: luxProducts,
            totalCost: luxProducts.reduce((s, p) => s + p.price, 0),
            focus: "کیفیت بالا",
          });
        }

        setRecommendations(results);

        if (results.length === 0) {
          toast.error("محصول کافی برای پیشنهاد وجود ندارد");
        }
      } catch (e) {
        console.error("خطا در تولید پیشنهادات:", e);
        toast.error("خطا در تولید پیشنهادات");
      } finally {
        setGenerating(false);
      }
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
            با وارد کردن اطلاعات زیر، سه پیشنهاد خرید هوشمند از {allProducts.length} محصول واقعی بازار دریافت کنید
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
                  disabled={!isFormValid || generating || loadingData || allProducts.length === 0}
                  className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-bold text-base shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all"
                >
                  {loadingData ? (
                    <><Loader2 className="animate-spin ml-2" size={18} /> در حال بارگذاری محصولات...</>
                  ) : generating ? (
                    <><Loader2 className="animate-spin ml-2" size={18} /> در حال تحلیل...</>
                  ) : (
                    <><Sparkles size={18} className="ml-2" /> دریافت پیشنهادات خرید</>
                  )}
                </Button>

                {allProducts.length === 0 && !loadingData && (
                  <p className="text-xs text-center text-muted-foreground">
                    هیچ محصولی در بازار موجود نیست
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Recommendations */}
          <div className="lg:col-span-3 space-y-6">
            {generating && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-accent mb-4" size={48} />
                <p className="text-lg font-bold text-foreground mb-1">در حال تحلیل اطلاعات...</p>
                <p className="text-sm text-muted-foreground">هوش مصنوعی در حال محاسبه بهترین گزینه‌ها از {allProducts.length} محصول واقعی بازار برای شماست</p>
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
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Store size={12} />
                  <span>{allProducts.length} محصول واقعی در بازار موجود است</span>
                </div>
              </div>
            )}

            {!generating && recommendations.map((rec, idx) => (
              <Card
                key={rec.id}
                className="overflow-hidden border-border/60 shadow-sm transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                {/* Header with store info */}
                <div className="relative bg-gradient-to-l from-accent/10 to-accent/5 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="bg-accent/90 text-accent-foreground border-0 text-[10px]">
                      پیشنهاد {idx + 1}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-foreground border-border/40 text-[10px]">
                      {rec.focus}
                    </Badge>
                  </div>
                  <h3 className="text-foreground font-bold text-lg mt-2">{rec.name}</h3>
                  <p className="text-muted-foreground text-xs">{rec.desc}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {rec.products.length} محصول از {new Set(rec.products.map(p => p.store_name)).size} فروشگاه
                  </p>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* Products - همه از دیتابیس واقعی */}
                  <div className="space-y-2">
                    {rec.products.map((p, pi) => (
                      <div key={`${rec.id}-${pi}`} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-2">
                        <div className="h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold line-clamp-1">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Store size={10} />
                            <span>{p.store_name}</span>
                            <span className="opacity-50">•</span>
                            <span>{p.category}</span>
                          </div>
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold text-accent">
                          {fmt(p.price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Total - محاسبه شده از محصولات واقعی */}
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