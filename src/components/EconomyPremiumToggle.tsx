import { useState, useMemo, useEffect, useCallback } from "react";
import { Sparkles, BadgePercent, TrendingDown, TrendingUp, ArrowLeft, CheckCircle, RefreshCw, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ---- Types ----
interface Product {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  category_id?: string | null;
  profile_id?: string;
}

interface MarketplaceAlt {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  profile_id: string;
  store_name?: string;
}

interface EconomyPremiumToggleProps {
  currentProducts: Product[];
  onReplace: (products: Product[]) => void;
  className?: string;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

type VersionType = "original" | "economy" | "premium";

/**
 * EconomyPremiumToggle - جایگزینی محصولات با محصولات واقعی بازار
 * 
 * به جای دیتای ساختگی، از دیتابیس محصولات واقعی را دریافت می‌کند:
 * - نسخه اقتصادی: محصولات ارزان‌تر از همان دسته‌بندی
 * - نسخه لوکس: محصولات گران‌تر از همان دسته‌بندی
 */
export default function EconomyPremiumToggle({
  currentProducts,
  onReplace,
  className,
}: EconomyPremiumToggleProps) {
  const [activeVersion, setActiveVersion] = useState<VersionType>("original");
  const [animating, setAnimating] = useState(false);
  const [economyAlts, setEconomyAlts] = useState<Record<string, MarketplaceAlt[]>>({});
  const [premiumAlts, setPremiumAlts] = useState<Record<string, MarketplaceAlt[]>>({});
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});

  // بارگذاری جایگزین‌های واقعی از دیتابیس
  const loadAlternatives = useCallback(async () => {
    if (currentProducts.length === 0) return;

    setLoadingAlts(true);
    const ecoMap: Record<string, MarketplaceAlt[]> = {};
    const preMap: Record<string, MarketplaceAlt[]> = {};
    const allProfileIds = new Set<string>();

    try {
      for (const product of currentProducts) {
        const categoryId = product.category_id;

        if (!categoryId) continue;

        // محصولات ارزان‌تر (اقتصادی)
        const { data: cheaper } = await supabase
          .from("products")
          .select("id, name, price, image_url, profile_id")
          .eq("is_active", true)
          .eq("category_id", categoryId)
          .not("image_url", "is", null)
          .not("price", "is", null)
          .lt("price", Number(product.price) || 0)
          .neq("id", product.id)
          .order("price", { ascending: false })
          .limit(3);

        if (cheaper && cheaper.length > 0) {
          ecoMap[product.id] = cheaper as MarketplaceAlt[];
          cheaper.forEach((p) => allProfileIds.add(p.profile_id));
        }

        // محصولات گران‌تر (لوکس)
        const { data: expensive } = await supabase
          .from("products")
          .select("id, name, price, image_url, profile_id")
          .eq("is_active", true)
          .eq("category_id", categoryId)
          .not("image_url", "is", null)
          .not("price", "is", null)
          .gt("price", Number(product.price) || 0)
          .neq("id", product.id)
          .order("price", { ascending: true })
          .limit(3);

        if (expensive && expensive.length > 0) {
          preMap[product.id] = expensive as MarketplaceAlt[];
          expensive.forEach((p) => allProfileIds.add(p.profile_id));
        }
      }

      // دریافت نام فروشگاه‌ها
      if (allProfileIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, brand_name")
          .in("id", [...allProfileIds]);

        const nameMap: Record<string, string> = {};
        (profiles || []).forEach((p) => {
          nameMap[p.id] = p.brand_name || "فروشگاه";
        });
        setStoreNames(nameMap);

        // اضافه کردن نام فروشگاه به جایگزین‌ها
        for (const key of Object.keys(ecoMap)) {
          ecoMap[key] = ecoMap[key].map((alt) => ({
            ...alt,
            store_name: nameMap[alt.profile_id] || "فروشگاه",
          }));
        }
        for (const key of Object.keys(preMap)) {
          preMap[key] = preMap[key].map((alt) => ({
            ...alt,
            store_name: nameMap[alt.profile_id] || "فروشگاه",
          }));
        }
      }

      setEconomyAlts(ecoMap);
      setPremiumAlts(preMap);
    } catch (e) {
      console.error("خطا در بارگذاری جایگزین‌ها:", e);
    } finally {
      setLoadingAlts(false);
    }
  }, [currentProducts]);

  useEffect(() => {
    loadAlternatives();
  }, [loadAlternatives]);

  const originalTotal = useMemo(
    () => currentProducts.reduce((s, p) => s + (Number(p.price) || 0), 0),
    [currentProducts],
  );

  const findAlt = (product: Product, version: "economy" | "premium"): MarketplaceAlt | null => {
    const alts = version === "economy" ? economyAlts : premiumAlts;
    const matches = alts[product.id] || [];
    return matches.length > 0 ? matches[0] : null;
  };

  const economyTotal = useMemo(() => {
    let total = 0;
    for (const p of currentProducts) {
      const alt = findAlt(p, "economy");
      total += alt ? (Number(alt.price) || 0) : (Number(p.price) || 0);
    }
    return total;
  }, [currentProducts, economyAlts]);

  const premiumTotal = useMemo(() => {
    let total = 0;
    for (const p of currentProducts) {
      const alt = findAlt(p, "premium");
      total += alt ? (Number(alt.price) || 0) : (Number(p.price) || 0);
    }
    return total;
  }, [currentProducts, premiumAlts]);

  const handleApply = (version: "economy" | "premium") => {
    setAnimating(true);
    setActiveVersion(version);

    const alts = version === "economy" ? economyAlts : premiumAlts;

    // شبیه‌سازی زمان جستجو
    setTimeout(() => {
      const replaced: Product[] = currentProducts.map((p) => {
        const matches = alts[p.id];
        if (matches && matches.length > 0) {
          const alt = matches[0];
          return {
            ...p,
            id: alt.id,
            name: alt.name,
            price: alt.price ? Number(alt.price) : null,
            image_url: alt.image_url,
            profile_id: alt.profile_id,
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
      setAnimating(false);
    }, 300);
  };

  const currentTotal = activeVersion === "economy" ? economyTotal : activeVersion === "premium" ? premiumTotal : originalTotal;
  const diff = currentTotal - originalTotal;

  // تعداد جایگزین‌های موجود
  const ecoCount = Object.values(economyAlts).flat().length;
  const preCount = Object.values(premiumAlts).flat().length;

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          نسخه‌های جایگزین
        </h3>
        {loadingAlts && (
          <RefreshCw size={14} className="animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Economy Version */}
        <button
          onClick={() => handleApply("economy")}
          disabled={animating || loadingAlts || ecoCount === 0}
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
            {ecoCount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {ecoCount} جایگزین اقتصادی در بازار موجود است
              </p>
            )}
            {ecoCount === 0 && !loadingAlts && (
              <p className="text-[10px] text-amber-500 mt-1">جایگزین اقتصادی یافت نشد</p>
            )}
          </div>
        </button>

        {/* Premium Version */}
        <button
          onClick={() => handleApply("premium")}
          disabled={animating || loadingAlts || preCount === 0}
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
            {preCount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {preCount} جایگزین لوکس در بازار موجود است
              </p>
            )}
            {preCount === 0 && !loadingAlts && (
              <p className="text-[10px] text-amber-500 mt-1">جایگزین لوکس یافت نشد</p>
            )}
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