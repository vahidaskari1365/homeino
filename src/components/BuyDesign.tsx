import { useEffect, useRef, useState, useMemo } from "react";
import { ShoppingCart, Store, Sparkles, Truck, PackageOpen, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Product } from "./types";

const products: Product[] = [
  {
    id: "1",
    image: "https://picsum.photos/seed/sofa/100/100",
    name: "مبل شیک مدرن",
    category: "مبل و کاناپه",
    store: "فروشگاه دکوراسیون مدرن",
    price: 18500000,
  },
  {
    id: "2",
    image: "https://picsum.photos/seed/table/100/100",
    name: "میز عسلی چوبی",
    category: "میز",
    store: "چوب‌آرایان",
    price: 4200000,
  },
  {
    id: "3",
    image: "https://picsum.photos/seed/lamp/100/100",
    name: "آباژور ایستاده",
    category: "روشنایی",
    store: "نورگان",
    price: 2850000,
  },
  {
    id: "4",
    image: "https://picsum.photos/seed/rug/100/100",
    name: "فرش دستبافت ابریشم",
    category: "فرش",
    store: "قالی‌سرای ایرانیان",
    price: 32000000,
  },
];

function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR") + " تومان";
}

type PurchaseMode = "one_store" | "lowest_total";

// Shipping costs per store (random for simulation)
const shippingCosts: Record<string, number> = {
  "فروشگاه دکوراسیون مدرن": 150000,
  "چوب‌آرایان": 80000,
  "نورگان": 100000,
  "قالی‌سرای ایرانیان": 200000,
};

// Group products by store
const groupedByStore = products.reduce<Record<string, { store: string; items: Product[] }>>((acc, p) => {
  if (!acc[p.store]) acc[p.store] = { store: p.store, items: [] };
  acc[p.store].items.push(p);
  return acc;
}, {});

const storeGroups = Object.values(groupedByStore);

export default function BuyDesign() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PurchaseMode>("one_store");
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);
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

  const productTotal = useMemo(
    () => products.reduce((sum, p) => sum + p.price, 0),
    [],
  );

  const shippingTotal = useMemo(() => {
    if (mode === "one_store") {
      // When buying from one store, we need to pick one store that has the most products
      // and pay shipping for that store only
      const biggest = storeGroups.reduce((max, g) => (g.items.length > max.items.length ? g : max), storeGroups[0]);
      return shippingCosts[biggest.store] || 0;
    }
    // Lowest total: combine stores, pay shipping for each
    return storeGroups.reduce((sum, g) => sum + (shippingCosts[g.store] || 0), 0);
  }, [mode]);

  const finalTotal = productTotal + shippingTotal;

  const handlePurchase = () => {
    setPurchasing(true);
    // Simulate purchase
    setTimeout(() => {
      setPurchasing(false);
      setPurchased(true);
      setTimeout(() => {
        setPurchased(false);
        setOpen(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "w-full max-w-2xl transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
      )}
    >
      {/* Large CTA Button */}
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 py-7 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-3">
          <ShoppingCart size={24} className="transition-transform group-hover:-translate-y-0.5" />
          خرید این طراحی
          <Sparkles size={20} className="text-emerald-200 transition-transform group-hover:rotate-12" />
        </span>
      </Button>

      {/* Subtitle */}
      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
        با یک کلیک همه محصولات طراحی را به سبد خرید اضافه کنید
      </p>

      {/* Purchase Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 sm:max-w-lg" dir="rtl">
          <DialogHeader className="border-b border-border/40 px-6 pb-4 pt-6">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ShoppingCart size={20} className="text-emerald" />
              خرید این طراحی
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              محصولات استفاده شده در این طراحی را خریداری کنید
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            {/* Purchase Mode Selection */}
            <div className="mb-4 mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">حالت خرید:</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => setMode("one_store")}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all",
                    mode === "one_store"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-300"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  <Store size={18} />
                  <div className="text-right">
                    <span className="block text-xs font-bold">خرید از یک فروشگاه</span>
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      ارسال یک باره
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setMode("lowest_total")}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all",
                    mode === "lowest_total"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-300"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  <Sparkles size={18} />
                  <div className="text-right">
                    <span className="block text-xs font-bold">کمترین قیمت کل</span>
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      ترکیب فروشندگان
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Product List Summary */}
            <Card className="mb-4 border-border/50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <PackageOpen size={14} />
                  محصولات ({products.length} عدد)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pb-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center gap-2">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-gray-800 dark:text-gray-200">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {product.store}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-emerald">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Price Breakdown */}
            <div className="space-y-2 rounded-xl bg-muted/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">جمع محصولات</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {formatPrice(productTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Truck size={14} />
                  هزینه ارسال
                </span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {formatPrice(shippingTotal)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-base">
                <span className="font-bold text-gray-900 dark:text-gray-100">جمع نهایی</span>
                <span className="text-lg font-bold text-emerald">
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>

            {/* Store breakdown for lowest total */}
            {mode === "lowest_total" && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground">هزینه ارسال هر فروشگاه:</p>
                {storeGroups.map((g) => (
                  <div key={g.store} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{g.store}</span>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      {formatPrice(shippingCosts[g.store] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Purchase Button */}
            <Button
              onClick={handlePurchase}
              disabled={purchasing || purchased}
              className="mt-4 w-full rounded-xl bg-emerald py-6 text-base font-bold text-white shadow-lg shadow-emerald/20 transition-all hover:bg-emerald/90 hover:shadow-xl hover:shadow-emerald/25"
            >
              {purchasing ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  در حال ثبت سفارش...
                </span>
              ) : purchased ? (
                <span className="flex items-center gap-2">
                  <CheckCircle size={18} />
                  سفارش با موفقیت ثبت شد
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShoppingCart size={18} />
                  ثبت سفارش
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}