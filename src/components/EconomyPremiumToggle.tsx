import { useState, useMemo } from "react";
import { Sparkles, BadgePercent, TrendingDown, TrendingUp, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
}

interface ProductAlt {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface EconomyPremiumToggleProps {
  currentProducts: Product[];
  onReplace: (products: Product[]) => void;
  className?: string;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

// Mock economy alternatives (cheaper)
const economyAlts: Record<string, ProductAlt[]> = {
  "مبل شیک مدرن": [
    { id: "eco-1", name: "مبل ساده و شیک", price: 12500000, image_url: "https://picsum.photos/seed/eco-sofa/200/200" },
    { id: "eco-2", name: "مبل تاشو مدرن", price: 9800000, image_url: "https://picsum.photos/seed/eco-sofa2/200/200" },
  ],
  "میز عسلی چوبی": [
    { id: "eco-3", name: "میز عسلی ام‌دی‌اف", price: 2200000, image_url: "https://picsum.photos/seed/eco-table/200/200" },
  ],
  "آباژور ایستاده": [
    { id: "eco-4", name: "چراغ رومیزی ساده", price: 1200000, image_url: "https://picsum.photos/seed/eco-lamp/200/200" },
  ],
  "فرش دستبافت ابریشم": [
    { id: "eco-5", name: "فرش ماشینی طرح ابریشم", price: 8500000, image_url: "https://picsum.photos/seed/eco-rug/200/200" },
  ],
};

// Mock premium alternatives (more expensive)
const premiumAlts: Record<string, ProductAlt[]> = {
  "مبل شیک مدرن": [
    { id: "pre-1", name: "مبل سلطنتی چرم", price: 35000000, image_url: "https://picsum.photos/seed/pre-sofa/200/200" },
    { id: "pre-2", name: "مبل دکوراتیو ایتالیایی", price: 42000000, image_url: "https://picsum.photos/seed/pre-sofa2/200/200" },
  ],
  "میز عسلی چوبی": [
    { id: "pre-3", name: "میز عسلی چوب گردو", price: 8500000, image_url: "https://picsum.photos/seed/pre-table/200/200" },
  ],
  "آباژور ایستاده": [
    { id: "pre-4", name: "لوستر کریستالی مدرن", price: 6500000, image_url: "https://picsum.photos/seed/pre-lamp/200/200" },
  ],
  "فرش دستبافت ابریشم": [
    { id: "pre-5", name: "فرش دستبافت ابریشم نفیس", price: 55000000, image_url: "https://picsum.photos/seed/pre-rug/200/200" },
  ],
};

type VersionType = "original" | "economy" | "premium";

export default function EconomyPremiumToggle({
  currentProducts,
  onReplace,
  className,
}: EconomyPremiumToggleProps) {
  const [activeVersion, setActiveVersion] = useState<VersionType>("original");
  const [animating, setAnimating] = useState(false);

  const originalTotal = useMemo(
    () => currentProducts.reduce((s, p) => s + (Number(p.price) || 0), 0),
    [currentProducts],
  );

  const findAlt = (product: Product, version: "economy" | "premium"): ProductAlt | null => {
    const alts = version === "economy" ? economyAlts : premiumAlts;
    const matches = alts[product.name] || [];
    return matches.length > 0 ? matches[0] : null;
  };

  const economyTotal = useMemo(() => {
    let total = 0;
    for (const p of currentProducts) {
      const alt = findAlt(p, "economy");
      total += alt ? alt.price : (Number(p.price) || 0);
    }
    return total;
  }, [currentProducts]);

  const premiumTotal = useMemo(() => {
    let total = 0;
    for (const p of currentProducts) {
      const alt = findAlt(p, "premium");
      total += alt ? alt.price : (Number(p.price) || 0);
    }
    return total;
  }, [currentProducts]);

  const handleApply = (version: "economy" | "premium") => {
    setAnimating(true);
    setActiveVersion(version);

    // Simulate replacement delay
    setTimeout(() => {
      const alts = version === "economy" ? economyAlts : premiumAlts;
      const replaced: Product[] = currentProducts.map((p) => {
        const matches = alts[p.name];
        if (matches && matches.length > 0) {
          const alt = matches[0];
          return {
            ...p,
            id: alt.id,
            name: alt.name,
            price: alt.price,
            image_url: alt.image_url,
          };
        }
        return p;
      });
      onReplace(replaced);
      setAnimating(false);
    }, 800);
  };

  const handleReset = () => {
    setAnimating(true);
    setTimeout(() => {
      setActiveVersion("original");
      // Reset back to original products by calling onReplace with the original products
      // Since we don't have the original reference, we just toggle the UI state
      setAnimating(false);
    }, 300);
  };

  const currentTotal = activeVersion === "economy" ? economyTotal : activeVersion === "premium" ? premiumTotal : originalTotal;
  const diff = currentTotal - originalTotal;

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          نسخه‌های جایگزین
        </h3>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Economy Version */}
        <button
          onClick={() => handleApply("economy")}
          disabled={animating}
          className={cn(
            "flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-right transition-all",
            activeVersion === "economy"
              ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/20"
              : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/10",
          )}
        >
          <div className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
            activeVersion === "economy" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
          )}>
            <TrendingDown size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">نسخه اقتصادی</span>
              {activeVersion === "economy" && (
                <Badge variant="secondary" className="bg-emerald/10 text-emerald border-emerald/20 text-[10px]">
                  <CheckCircle size={10} className="ml-0.5" /> فعال
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">جایگزینی با محصولات مقرون‌به‌صرفه</p>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="text-gray-500 line-through">{fmt(originalTotal)}</span>
              <ArrowLeft size={10} className="text-emerald" />
              <span className="font-bold text-emerald">{fmt(economyTotal)}</span>
            </div>
          </div>
        </button>

        {/* Premium Version */}
        <button
          onClick={() => handleApply("premium")}
          disabled={animating}
          className={cn(
            "flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-right transition-all",
            activeVersion === "premium"
              ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/20"
              : "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-700 dark:hover:bg-amber-950/10",
          )}
        >
          <div className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
            activeVersion === "premium" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
          )}>
            <TrendingUp size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">نسخه لوکس</span>
              {activeVersion === "premium" && (
                <Badge variant="secondary" className="bg-amber/10 text-amber border-amber/20 text-[10px]">
                  <CheckCircle size={10} className="ml-0.5" /> فعال
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">جایگزینی با محصولات لوکس و باکیفیت</p>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="text-gray-500 line-through">{fmt(originalTotal)}</span>
              <ArrowLeft size={10} className="text-amber-500" />
              <span className="font-bold text-amber-600">{fmt(premiumTotal)}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Price Summary Card when a version is active */}
      {activeVersion !== "original" && (
        <Card
          className={cn(
            "mt-4 transition-all duration-500",
            activeVersion === "economy"
              ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/15"
              : "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/15",
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeVersion === "economy" ? (
                  <BadgePercent size={18} className="text-emerald" />
                ) : (
                  <Sparkles size={18} className="text-amber-500" />
                )}
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {activeVersion === "economy" ? "نسخه اقتصادی" : "نسخه لوکس"}
                </span>
              </div>
              <Button
                onClick={handleReset}
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-gray-500 hover:text-red-500"
              >
                <RefreshCw size={12} className="ml-1" />
                بازگشت به نسخه اصلی
              </Button>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">قیمت اصلی</span>
                <span className="text-gray-500 line-through">{fmt(originalTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">قیمت جدید</span>
                <span className={cn(
                  "font-bold text-lg",
                  activeVersion === "economy" ? "text-emerald" : "text-amber-600",
                )}>
                  {fmt(currentTotal)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">تفاوت قیمت</span>
                <span className={cn(
                  "font-bold",
                  diff < 0 ? "text-emerald" : "text-amber-600",
                )}>
                  {diff < 0 ? "↓ " : "↑ "}
                  {fmt(Math.abs(diff))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading overlay */}
      {animating && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-50 p-3 text-sm font-bold text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
          <RefreshCw size={16} className="animate-spin" />
          در حال جایگزینی محصولات...
        </div>
      )}
    </div>
  );
}