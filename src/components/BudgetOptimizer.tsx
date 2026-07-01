import { useEffect, useRef, useState, useMemo } from "react";
import { AlertTriangle, BadgePercent, CheckCircle, RefreshCw, ArrowLeft, Wallet, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AltProduct {
  id: string;
  name: string;
  image: string;
  category: string;
  store: string;
  price: number;
  altName: string;
  altImage: string;
  altPrice: number;
}

const cheapers: Record<string, AltProduct[]> = {
  "مبل و کاناپه": [
    {
      id: "alt-1",
      name: "مبل شیک مدرن",
      image: "https://picsum.photos/seed/sofa/100/100",
      category: "مبل و کاناپه",
      store: "فروشگاه دکوراسیون مدرن",
      price: 18500000,
      altName: "مبل ساده و شیک",
      altImage: "https://picsum.photos/seed/sofa-alt/100/100",
      altPrice: 12500000,
    },
    {
      id: "alt-2",
      name: "مبل کلاسیک لوکس",
      image: "https://picsum.photos/seed/sofa2/100/100",
      category: "مبل و کاناپه",
      store: "فروشگاه مبل ایران",
      price: 22000000,
      altName: "مبل کلاسیک اقتصادی",
      altImage: "https://picsum.photos/seed/sofa2-alt/100/100",
      altPrice: 14800000,
    },
  ],
  "میز": [
    {
      id: "alt-3",
      name: "میز عسلی چوبی",
      image: "https://picsum.photos/seed/table/100/100",
      category: "میز",
      store: "چوب‌آرایان",
      price: 4200000,
      altName: "میز عسلی ساده",
      altImage: "https://picsum.photos/seed/table-alt/100/100",
      altPrice: 2800000,
    },
  ],
  "روشنایی": [
    {
      id: "alt-4",
      name: "آباژور ایستاده",
      image: "https://picsum.photos/seed/lamp/100/100",
      category: "روشنایی",
      store: "نورگان",
      price: 2850000,
      altName: "چراغ دیواری مدرن",
      altImage: "https://picsum.photos/seed/lamp-alt/100/100",
      altPrice: 1850000,
    },
  ],
  "فرش": [
    {
      id: "alt-5",
      name: "فرش دستبافت ابریشم",
      image: "https://picsum.photos/seed/rug/100/100",
      category: "فرش",
      store: "قالی‌سرای ایرانیان",
      price: 32000000,
      altName: "فرش ماشینی با طرح ابریشم",
      altImage: "https://picsum.photos/seed/rug-alt/100/100",
      altPrice: 12000000,
    },
  ],
};

function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR") + " تومان";
}

export default function BudgetOptimizer() {
  const [budget, setBudget] = useState<string>("50000000");
  const [replaced, setReplaced] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const numericBudget = useMemo(() => {
    const parsed = Number(budget.replace(/,/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }, [budget]);

  const products = useMemo(() => {
    const all: AltProduct[] = [];
    for (const prods of Object.values(cheapers)) {
      all.push(...prods);
    }
    return all;
  }, []);

  const totalCost = useMemo(
    () => products.reduce((sum, p) => sum + (replaced.has(p.id) ? p.altPrice : p.price), 0),
    [products, replaced],
  );

  const isOverBudget = numericBudget > 0 && totalCost > numericBudget;

  const savings = useMemo(() => {
    let total = 0;
    for (const p of products) {
      if (replaced.has(p.id)) {
        total += p.price - p.altPrice;
      }
    }
    return total;
  }, [products, replaced]);

  const handleReplace = (productId: string) => {
    setReplaced((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleReset = () => {
    setReplaced(new Set());
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setBudget(raw);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "w-full max-w-2xl transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <BadgePercent className="h-5 w-5 text-emerald" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          بهینه‌سازی بودجه
        </h3>
      </div>

      {/* Budget Input */}
      <Card className="mb-4 border-border/60 shadow-sm">
        <CardContent className="p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            بودجه شما چقدر است؟
          </label>
          <div className="relative">
            <Wallet className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              inputMode="numeric"
              value={budget ? Number(budget).toLocaleString("fa-IR") : ""}
              onChange={handleBudgetChange}
              placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
              className="h-12 w-full rounded-xl pr-10 text-left font-bold text-lg"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              هزینه کل طراحی:{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {formatPrice(totalCost)}
              </span>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              بودجه:{" "}
              <span
                className={cn(
                  "font-bold",
                  isOverBudget
                    ? "text-red-500"
                    : "text-emerald",
                )}
              >
                {formatPrice(numericBudget)}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Warning Card */}
      {isOverBudget && (
        <div
          className={cn(
            "mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 transition-all duration-500 dark:border-red-900 dark:bg-red-950/30",
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-bold text-red-700 dark:text-red-400">
              بودجه شما کافی نیست!
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">
              هزینه کل طراحی از بودجه شما بیشتر است. می‌توانید محصولات زیر را با
              گزینه‌های مقرون‌به‌صرفه‌تر جایگزین کنید.
            </p>
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              مبلغ مورد نیاز: <span className="font-bold">{formatPrice(totalCost - numericBudget)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Alternative Products */}
      {isOverBudget && (
        <div className="flex flex-col gap-3">
          {products.map((product, index) => {
            const isReplaced = replaced.has(product.id);
            const moneySaved = product.price - product.altPrice;

            return (
              <div
                key={product.id}
                className={cn(
                  "rounded-xl border bg-white p-3 shadow-sm transition-all duration-500 dark:bg-gray-800",
                  isReplaced
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
                    : "border-gray-200 dark:border-gray-700",
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Current product */}
                <div className="mb-2 flex items-center gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-14 w-14 flex-shrink-0 rounded-lg object-cover opacity-70"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-through opacity-60">
                      {product.name}
                    </p>
                    <p className="text-xs text-red-500 line-through">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowLeft className="h-4 w-4 text-gray-400" />
                </div>

                {/* Alternative product */}
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={product.altImage}
                    alt={product.altName}
                    className={cn(
                      "h-14 w-14 flex-shrink-0 rounded-lg object-cover transition-all duration-500",
                      isReplaced ? "ring-2 ring-emerald-400 ring-offset-2" : "",
                    )}
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "text-sm font-bold transition-colors",
                      isReplaced
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-gray-900 dark:text-gray-100",
                    )}>
                      {product.altName}
                    </p>
                    <p className="text-sm font-bold text-emerald">
                      {formatPrice(product.altPrice)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-left">
                    {isReplaced && (
                      <Badge variant="secondary" className="bg-emerald/10 text-emerald border-emerald/20 mb-1">
                        <CheckCircle className="ml-1 h-3 w-3" />
                        جایگزین شد
                      </Badge>
                    )}
                    <p className="text-xs text-emerald font-bold whitespace-nowrap">
                      صرفه‌جویی: {formatPrice(moneySaved)}
                    </p>
                  </div>
                </div>

                {/* Replace button */}
                <Button
                  onClick={() => handleReplace(product.id)}
                  variant={isReplaced ? "outline" : "default"}
                  size="sm"
                  className={cn(
                    "mt-3 w-full rounded-xl font-bold transition-all",
                    isReplaced
                      ? "border-emerald/40 text-emerald hover:bg-emerald/5"
                      : "bg-emerald hover:bg-emerald/90 text-white",
                  )}
                >
                  <RefreshCw className={cn(
                    "ml-1 h-4 w-4 transition-transform",
                    isReplaced ? "rotate-180" : "",
                  )} />
                  {isReplaced ? "بازگردانی به محصول قبلی" : "جایگزینی با این محصول"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Success / Summary */}
      {!isOverBudget && numericBudget > 0 && (
        <div
          className={cn(
            "mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-all duration-500 dark:border-emerald-900 dark:bg-emerald-950/20",
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald" />
          <div className="flex-1">
            <p className="font-bold text-emerald-700 dark:text-emerald-400">
              بودجه شما کافی است!
            </p>
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-300">
              هزینه کل طراحی در محدوده بودجه شما قرار دارد.
            </p>
          </div>
        </div>
      )}

      {!isOverBudget && numericBudget === 0 && (
        <Card className="border-dashed border-gray-300 dark:border-gray-600">
          <CardContent className="p-6 text-center">
            <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              بودجه خود را وارد کنید تا گزینه‌های بهینه‌سازی نمایش داده شوند.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Savings Summary */}
      {savings > 0 && (
        <div
          className={cn(
            "mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-base font-bold transition-all duration-700 dark:border-emerald-800 dark:bg-emerald-950/30",
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <div className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-emerald" />
            <span className="text-gray-800 dark:text-gray-200">
              مجموع صرفه‌جویی
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald text-lg">{formatPrice(savings)}</span>
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 hover:text-red-500"
            >
              <RefreshCw className="ml-1 h-3 w-3" />
              بازنشانی
            </Button>
          </div>
        </div>
      )}

      {/* Show adjusted total if replacements made */}
      {replaced.size > 0 && (
        <div
          className={cn(
            "mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-white p-4 text-base font-bold shadow-sm transition-all duration-700 dark:border-emerald-800 dark:bg-gray-800",
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <span className="text-gray-800 dark:text-gray-200">
            هزینه کل پس از بهینه‌سازی
          </span>
          <span className="text-emerald text-lg">
            {formatPrice(totalCost)}
          </span>
        </div>
      )}
    </div>
  );
}