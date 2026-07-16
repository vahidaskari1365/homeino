// ============================================================
// Homeino — Product Intelligence Layer
// ============================================================
// NEVER send the full product database to the model. Category-based
// round-robin selection + budget-aware price-distance ranking, capped at
// MAX_PRODUCTS_PER_REQUEST, keeps the request representative of the catalog
// instead of an arbitrary array-order truncation.

import type { ProductInput } from "./types.ts";
import { MAX_PRODUCTS_PER_REQUEST } from "./validation.ts";

export function selectTopProducts(
  products: ProductInput[],
  budget: number | undefined,
  max: number = MAX_PRODUCTS_PER_REQUEST
): ProductInput[] {
  if (products.length <= max) return products;

  const perItemTarget = budget && budget > 0 ? budget / Math.max(1, Math.min(max, products.length)) : null;

  const scored = products.map((p) => {
    const overBudget = typeof budget === "number" && budget > 0 && p.price > budget;
    const priceDistance = perItemTarget !== null ? Math.abs(p.price - perItemTarget) : p.price;
    // FEATURED PRODUCTS: only a small tie-breaking nudge (2%) toward stores
    // that purchased Featured placement — never enough to beat a genuinely
    // more relevant/cheaper match.
    const featuredNudge = p.is_featured ? 0.98 : 1;
    const score = priceDistance * featuredNudge + (overBudget ? 1_000_000_000 : 0);
    return { product: p, score };
  });

  const byCategory = new Map<string, typeof scored>();
  for (const item of scored) {
    const key = item.product.category || "other";
    const arr = byCategory.get(key) ?? [];
    arr.push(item);
    byCategory.set(key, arr);
  }
  for (const arr of byCategory.values()) {
    arr.sort((a, b) => a.score - b.score);
  }

  const categories = [...byCategory.keys()];
  const result: ProductInput[] = [];
  let round = 0;
  while (result.length < max) {
    let addedInRound = false;
    for (const cat of categories) {
      const arr = byCategory.get(cat)!;
      if (arr[round]) {
        result.push(arr[round].product);
        addedInRound = true;
        if (result.length >= max) break;
      }
    }
    if (!addedInRound) break;
    round++;
  }

  return result;
}
