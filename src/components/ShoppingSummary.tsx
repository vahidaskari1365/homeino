import { useEffect, useRef, useState } from "react";
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

function ProductRow({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-500 dark:border-gray-700 dark:bg-gray-800 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      }`}
    >
      <img
        src={product.image}
        alt={product.name}
        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
        loading="lazy"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {product.name}
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {product.category}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {product.store}
        </span>
      </div>
      <div className="flex-shrink-0 text-left">
        <span className="whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {formatPrice(product.price)}
        </span>
      </div>
    </div>
  );
}

export default function ShoppingSummary() {
  const total = products.reduce((sum, p) => sum + p.price, 0);
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

  return (
    <div
      ref={ref}
      className={`w-full max-w-2xl transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <svg
          className="h-5 w-5 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          />
        </svg>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          خلاصه خرید
        </h3>
      </div>

      {/* Product List */}
      <div className="flex flex-col gap-3">
        {products.map((product, index) => (
          <ProductRow key={product.id} product={product} index={index} />
        ))}
      </div>

      {/* Total */}
      <div
        className={`mt-4 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-base font-bold transition-all duration-700 delay-500 dark:border-indigo-800 dark:bg-indigo-950/50 ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0"
        }`}
      >
        <span className="text-gray-800 dark:text-gray-200">
          هزینه کل طراحی
        </span>
        <span className="text-indigo-700 dark:text-indigo-300">
          {formatPrice(total)}
        </span>
      </div>
    </div>
  );
}