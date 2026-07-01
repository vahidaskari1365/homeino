import { useMemo, useState, useEffect } from "react";
import { Wallet, BadgePercent, TrendingDown, TrendingUp, Package, Store, PiggyBank, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  profile_id?: string;
  category_id?: string | null;
  store?: string;
}

interface FinancialReportProps {
  products: Product[];
  className?: string;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

/**
 * FinancialReport - گزارش مالی بر اساس محصولات واقعی بازار
 * 
 * به جای دیتای ساختگی، از دیتابیس محصولات واقعی برای محاسبه
 * نسخه‌های اقتصادی و لوکس استفاده می‌کند.
 */
export default function FinancialReport({ products, className }: FinancialReportProps) {
  const [economyTotal, setEconomyTotal] = useState<number | null>(null);
  const [premiumTotal, setPremiumTotal] = useState<number | null>(null);
  const [uniqueStores, setUniqueStores] = useState(0);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const originalTotal = useMemo(
    () => products.reduce((s, p) => s + (Number(p.price) || 0), 0),
    [products],
  );

  // بارگذاری جایگزین‌های واقعی از دیتابیس
  useEffect(() => {
    (async () => {
      if (products.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let ecoSum = 0;
        let preSum = 0;
        let ecoFound = 0;
        let preFound = 0;
        const profileIds = new Set<string>();

        for (const product of products) {
          if (product.profile_id) {
            profileIds.add(product.profile_id);
          }

          if (!product.category_id) {
            ecoSum += Number(product.price) || 0;
            preSum += Number(product.price) || 0;
            continue;
          }

          // محصول ارزان‌تر از همان دسته
          const { data: cheaper } = await supabase
            .from("products")
            .select("price")
            .eq("is_active", true)
            .eq("category_id", product.category_id)
            .not("price", "is", null)
            .lt("price", Number(product.price) || 0)
            .neq("id", product.id)
            .order("price", { ascending: false })
            .limit(1);

          if (cheaper && cheaper.length > 0) {
            ecoSum += Number(cheaper[0].price) || 0;
            ecoFound++;
          } else {
            ecoSum += Number(product.price) || 0;
          }

          // محصول گران‌تر از همان دسته
          const { data: expensive } = await supabase
            .from("products")
            .select("price")
            .eq("is_active", true)
            .eq("category_id", product.category_id)
            .not("price", "is", null)
            .gt("price", Number(product.price) || 0)
            .neq("id", product.id)
            .order("price", { ascending: true })
            .limit(1);

          if (expensive && expensive.length > 0) {
            preSum += Number(expensive[0].price) || 0;
            preFound++;
          } else {
            preSum += Number(product.price) || 0;
          }
        }

        setEconomyTotal(ecoSum);
        setPremiumTotal(preSum);

        // دریافت نام فروشگاه‌ها
        if (profileIds.size > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, brand_name")
            .in("id", [...profileIds]);

          const nameMap: Record<string, string> = {};
          (profiles || []).forEach((p) => {
            nameMap[p.id] = p.brand_name;
          });
          setStoreNames(nameMap);
        }

        setUniqueStores(profileIds.size);
      } catch (e) {
        console.error("خطا در بارگذاری گزارش مالی:", e);
        // Fallback به مقادیر اصلی
        setEconomyTotal(originalTotal);
        setPremiumTotal(originalTotal);
      } finally {
        setLoading(false);
      }
    })();
  }, [products, originalTotal]);

  const savings = originalTotal - (economyTotal ?? originalTotal);
  const maxCost = Math.max(originalTotal, premiumTotal ?? 0, economyTotal ?? 0);

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
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-2 w-48 rounded-full bg-muted animate-pulse" />
          </div>
        ) : (
          <>
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
                  <span className="font-bold text-emerald">{fmt(economyTotal ?? originalTotal)}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-emerald transition-all duration-700"
                    style={{ width: `${getBarWidth(economyTotal ?? originalTotal)}%` }}
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
                  <span className="font-bold text-amber-600">{fmt(premiumTotal ?? originalTotal)}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-700"
                    style={{ width: `${getBarWidth(premiumTotal ?? originalTotal)}%` }}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}