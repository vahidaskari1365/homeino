import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import ShoppingSummary from "~/components/ShoppingSummary";
import BudgetOptimizer from "~/components/BudgetOptimizer";
import PriceComparison from "~/components/PriceComparison";
import BuyDesign from "~/components/BuyDesign";

// Read the (optional) business name at request time so the placeholder can be
// personalized by writing site.json — no rebuild needed. Resolves relative to the
// server's working directory (the site root). Falls back to "" if absent/invalid.
const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center gap-8 px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="w-full text-center">
        <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          طراحی با هوش مصنوعی
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
          {businessName || "بازارچه هوش مصنوعی"}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          طراحی دکوراسیون منزل با هوش مصنوعی
        </p>
      </div>

      {/* Generated AI Image */}
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl shadow-lg">
        <img
          src="https://picsum.photos/seed/design/800/500"
          alt="طراحی دکوراسیون با هوش مصنوعی"
          className="h-auto w-full object-cover"
        />
      </div>

      {/* Shopping Summary */}
      <ShoppingSummary />

      {/* Buy This Design */}
      <BuyDesign />

      {/* Budget Optimization */}
      <BudgetOptimizer />

      {/* Price Comparison */}
      <PriceComparison />

      {/* Footer */}
      <footer className="mt-auto pt-8 text-sm text-gray-400 dark:text-gray-600">
        ساخته شده با{" "}
        <a
          href="https://cto.new"
          className="underline hover:text-gray-600 dark:hover:text-gray-400"
        >
          cto.new
        </a>
      </footer>
    </main>
  );
}