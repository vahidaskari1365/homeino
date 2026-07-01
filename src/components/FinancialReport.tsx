import { useMemo } from "react";
import { Wallet, BadgePercent, TrendingDown, TrendingUp, Package, Store, PiggyBank, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  profile_id?: string;
  store?: string;
}

interface FinancialReportProps {
  products: Product[];
  className?: string;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

// Same mock data as EconomyPremiumToggle for consistency
const economyAlts: Record<string, { price: number }> = {
  "مبل شیک مدرن": { price: 12500000 },
  "میز عسلی چوبی": { price: 2200000 },
  "آباژور ایستاده": { price: 1200000 },
  "فرش دستبافت ابریشم": { price: 8500000 },
};

const premiumAlts: Record<string, { price: number }> = {
  "مبل شیک مدرن": { price: 35000000 },
  "میز عسلی چوبی": { price: 8500000 },
  "آباژور ایستاده": { price: 6500000 },
  "فرش دستبافت ابریشم": { price: 55000000 },
};

export default function FinancialReport({ products, className }: FinancialReportProps) {
  const originalTotal = useMemo(
    () => products.reduce((s, p) => s + (Number(p.price) || 0), 0),
    [products],
  );

  const economyTotal = useMemo(() => {
    let total = 0;
    for (const p of products) {
      const alt = economyAlts[p.name];
      total += alt ? alt.price : (Number(p.price) || 0);
    }
    return total;
  }, [products]);

  const premiumTotal = useMemo(() => {
    let total = 0;
    for (const p of products) {
      const alt = premiumAlts[p.name];
      total += alt ? alt.price : (Number(p.price) || 0);
    }
    return total;
  }, [products]);

  const savings = originalTotal - economyTotal;

  const uniqueStores = useMemo(() => {
    const stores = new Set<string>();
    products.forEach((p) => {
      if (p.store) stores.add(p.store);
      if (p.profile_id) stores.add(p.profile_id);
    });
    return stores.size || Math.ceil(products.length / 2);
  }, [products]);

  const maxCost = Math.max(originalTotal, premiumTotal, economyTotal);

  const getBarWidth = (value: number) => {
    if (maxCost === 0) return 0;
    return (value / maxCost) * 100;
  };

  return (
    <Card className={cn("overflow-hidden border-border/60 shadow-sm", className)}>
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 size={18} className="text-accent" />
          گزارش مالی طراحی
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Cost bars */}
        <div className="space-y-3">
          {/* Original */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                <Wallet size={13} className="text-accent" />
                هزینه اصلی
              </span>
              <span className="font-bold text-accent">{fmt(originalTotal)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${getBarWidth(originalTotal)}%` }}
              />
            </div>
          </div>

          {/* Economy */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                <TrendingDown size={13} className="text-emerald" />
                نسخه اقتصادی
              </span>
              <span className="font-bold text-emerald">{fmt(economyTotal)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-emerald transition-all duration-700"
                style={{ width: `${getBarWidth(economyTotal)}%` }}
              />
            </div>
          </div>

          {/* Premium */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                <TrendingUp size={13} className="text-amber-500" />
                نسخه لوکس
              </span>
              <span className="font-bold text-amber-600">{fmt(premiumTotal)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-700"
                style={{ width: `${getBarWidth(premiumTotal)}%` }}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* Total Savings */}
          <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/20">
            <BadgePercent size={18} className="mx-auto mb-1 text-emerald" />
            <p className="text-[10px] text-muted-foreground">صرفه‌جویی</p>
            <p className="text-sm font-bold text-emerald">{fmt(savings)}</p>
          </div>

          {/* Product Count */}
          <div className="rounded-xl bg-indigo-50 p-3 text-center dark:bg-indigo-950/20">
            <Package size={18} className="mx-auto mb-1 text-indigo-500" />
            <p className="text-[10px] text-muted-foreground">تعداد محصولات</p>
            <p className="text-sm font-bold text-indigo-600">{products.length}</p>
          </div>

          {/* Store Count */}
          <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-950/20">
            <Store size={18} className="mx-auto mb-1 text-amber-500" />
            <p className="text-[10px] text-muted-foreground">تعداد فروشندگان</p>
            <p className="text-sm font-bold text-amber-600">{uniqueStores}</p>
          </div>
        </div>

        {/* Savings callout */}
        {savings > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500/10 to-emerald-500/5 p-3 text-sm">
            <PiggyBank size={18} className="text-emerald" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              با انتخاب نسخه اقتصادی می‌توانید <strong className="text-emerald">{fmt(savings)}</strong> صرفه‌جویی کنید
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}