import { useEffect, useRef, useState, useMemo } from "react";
import { Store, Clock, Truck, Star, Medal, ArrowUpDown, CheckCircle, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface StoreOffer {
  id: string;
  logo: string;
  name: string;
  price: number;
  inStock: boolean;
  deliveryDays: number;
  rating: number;
}

interface ProductOffers {
  productId: string;
  productName: string;
  productImage: string;
  productCategory: string;
  stores: StoreOffer[];
}

type SortKey = "price" | "rating" | "delivery";

const mockData: ProductOffers[] = [
  {
    productId: "1",
    productName: "مبل شیک مدرن",
    productImage: "https://picsum.photos/seed/sofa/100/100",
    productCategory: "مبل و کاناپه",
    stores: [
      { id: "s1", logo: "https://picsum.photos/seed/shop1/60/60", name: "فروشگاه دکوراسیون مدرن", price: 18500000, inStock: true, deliveryDays: 3, rating: 4.5 },
      { id: "s2", logo: "https://picsum.photos/seed/shop2/60/60", name: "مبل شاپ سنتر", price: 17200000, inStock: true, deliveryDays: 5, rating: 4.2 },
      { id: "s3", logo: "https://picsum.photos/seed/shop3/60/60", name: "خانه مدرن ایرانیان", price: 19800000, inStock: false, deliveryDays: 7, rating: 4.8 },
      { id: "s4", logo: "https://picsum.photos/seed/shop4/60/60", name: "فروشگاه مبلمان پارس", price: 16300000, inStock: true, deliveryDays: 2, rating: 3.9 },
    ],
  },
  {
    productId: "2",
    productName: "میز عسلی چوبی",
    productImage: "https://picsum.photos/seed/table/100/100",
    productCategory: "میز",
    stores: [
      { id: "s5", logo: "https://picsum.photos/seed/shop5/60/60", name: "چوب‌آرایان", price: 4200000, inStock: true, deliveryDays: 4, rating: 4.3 },
      { id: "s6", logo: "https://picsum.photos/seed/shop6/60/60", name: "صنایع چوب مهر", price: 3850000, inStock: true, deliveryDays: 3, rating: 4.6 },
      { id: "s7", logo: "https://picsum.photos/seed/shop7/60/60", name: "دکوراسیون چوبی", price: 4500000, inStock: true, deliveryDays: 6, rating: 4.1 },
    ],
  },
  {
    productId: "3",
    productName: "آباژور ایستاده",
    productImage: "https://picsum.photos/seed/lamp/100/100",
    productCategory: "روشنایی",
    stores: [
      { id: "s8", logo: "https://picsum.photos/seed/shop8/60/60", name: "نورگان", price: 2850000, inStock: true, deliveryDays: 2, rating: 4.4 },
      { id: "s9", logo: "https://picsum.photos/seed/shop9/60/60", name: "چراغ‌سرا", price: 2600000, inStock: true, deliveryDays: 3, rating: 4.0 },
      { id: "s10", logo: "https://picsum.photos/seed/shop10/60/60", name: "روشنایی مدرن", price: 3100000, inStock: false, deliveryDays: 5, rating: 4.7 },
    ],
  },
  {
    productId: "4",
    productName: "فرش دستبافت ابریشم",
    productImage: "https://picsum.photos/seed/rug/100/100",
    productCategory: "فرش",
    stores: [
      { id: "s11", logo: "https://picsum.photos/seed/shop11/60/60", name: "قالی‌سرای ایرانیان", price: 32000000, inStock: true, deliveryDays: 10, rating: 4.9 },
      { id: "s12", logo: "https://picsum.photos/seed/shop12/60/60", name: "فرش هیراد", price: 28500000, inStock: true, deliveryDays: 7, rating: 4.5 },
      { id: "s13", logo: "https://picsum.photos/seed/shop13/60/60", name: "قالی‌خانه", price: 34800000, inStock: true, deliveryDays: 14, rating: 4.3 },
    ],
  },
];

function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR") + " تومان";
}

function deliveryLabel(days: number): string {
  if (days <= 2) return "فوری";
  if (days <= 5) return "سریع";
  if (days <= 7) return "معمولی";
  return "طولانی";
}

function getSortLabel(key: SortKey): string {
  switch (key) {
    case "price": return "کمترین قیمت";
    case "rating": return "بیشترین امتیاز";
    case "delivery": return "سریع‌ترین تحویل";
  }
}

function StoreRow({
  offer,
  isBestPrice,
  index,
}: {
  offer: StoreOffer;
  isBestPrice: boolean;
  index: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-all duration-500 dark:bg-gray-800",
        isBestPrice
          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/15"
          : "border-gray-200 dark:border-gray-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      {/* Store Logo */}
      <Avatar className="h-12 w-12 flex-shrink-0 rounded-xl border border-gray-100 dark:border-gray-700">
        <AvatarImage src={offer.logo} alt={offer.name} />
        <AvatarFallback className="rounded-xl bg-muted">
          <Store size={18} className="text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      {/* Store Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
            {offer.name}
          </span>
          {isBestPrice && (
            <Badge variant="secondary" className="flex-shrink-0 bg-emerald/10 text-emerald border-emerald/20 text-[10px]">
              <Medal size={10} className="ml-0.5" />
              بهترین قیمت
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
          {/* Rating */}
          <span className="flex items-center gap-0.5">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {offer.rating.toLocaleString("fa-IR")}
          </span>
          {/* Delivery */}
          <span className="flex items-center gap-0.5">
            <Truck size={11} />
            {offer.deliveryDays} روزه ({deliveryLabel(offer.deliveryDays)})
          </span>
          {/* Availability */}
          <span className="flex items-center gap-0.5">
            {offer.inStock ? (
              <>
                <CheckCircle size={11} className="text-emerald" />
                <span className="text-emerald">موجود</span>
              </>
            ) : (
              <span className="text-red-400">ناموجود</span>
            )}
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="flex-shrink-0 text-left">
        <span
          className={cn(
            "whitespace-nowrap text-sm font-bold",
            isBestPrice
              ? "text-emerald dark:text-emerald-300"
              : "text-gray-800 dark:text-gray-200",
          )}
        >
          {formatPrice(offer.price)}
        </span>
      </div>
    </div>
  );
}

export default function PriceComparison() {
  const [sortKey, setSortKey] = useState<SortKey>("price");
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

  const sortedData = useMemo(() => {
    return mockData.map((product) => {
      const sorted = [...product.stores].sort((a, b) => {
        switch (sortKey) {
          case "price": return a.price - b.price;
          case "rating": return b.rating - a.rating;
          case "delivery": return a.deliveryDays - b.deliveryDays;
          default: return 0;
        }
      });
      return { ...product, stores: sorted };
    });
  }, [sortKey]);

  const sortOptions: SortKey[] = ["price", "rating", "delivery"];

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
        <ShoppingBag className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          مقایسه قیمت فروشندگان
        </h3>
      </div>

      {/* Sort Controls */}
      <Card className="mb-4 border-border/60 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            <ArrowUpDown size={14} />
            مرتب‌سازی بر اساس:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sortOptions.map((key) => (
              <Button
                key={key}
                onClick={() => setSortKey(key)}
                variant={sortKey === key ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg px-3 text-xs font-bold transition-all",
                  sortKey === key
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800",
                )}
              >
                {getSortLabel(key)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Product Store Comparisons */}
      <div className="flex flex-col gap-6">
        {sortedData.map((product) => {
          const bestPrice = Math.min(...product.stores.filter(s => s.inStock).map(s => s.price));
          const hasStock = product.stores.some(s => s.inStock);

          return (
            <Card
              key={product.productId}
              className={cn(
                "overflow-hidden border-border/60 shadow-sm transition-all duration-500",
                visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
              )}
            >
              {/* Product header */}
              <CardHeader className="flex flex-row items-center gap-3 border-b border-border/40 bg-muted/20 pb-3">
                <img
                  src={product.productImage}
                  alt={product.productName}
                  className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-bold">
                    {product.productName}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {product.productCategory}
                    <span className="mr-2 text-gray-400">
                      ({product.stores.length} فروشنده)
                    </span>
                  </p>
                </div>
                {!hasStock && (
                  <Badge variant="destructive" className="flex-shrink-0 text-[10px]">
                    ناموجود
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="flex flex-col gap-2 p-3">
                {product.stores.map((offer, idx) => (
                  <StoreRow
                    key={offer.id}
                    offer={offer}
                    isBestPrice={offer.inStock && offer.price === bestPrice}
                    index={idx}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}