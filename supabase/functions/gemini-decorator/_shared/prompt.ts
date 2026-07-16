// ============================================================
// Homeino — Prompt Builder
// ============================================================
// Enforces the STRICT JSON-only AI output contract.
// Separated from the main handler for readability and testability.

import type { ProductInput } from "./types.ts";

export function buildGeminiPrompt(
  products: ProductInput[],
  budget?: number
): string {
  const productLines = products
    .map(
      (p, i) =>
        `${i + 1}. ID: ${p.id} | Name: ${p.name} | Category: ${p.category} | Style: ${p.style} | Price: ${p.price} تومان | Width: ${p.width || "N/A"} | Height: ${p.height || "N/A"} | Depth: ${p.depth || "N/A"} | Tags: ${(p.tags || []).join(", ")}`
    )
    .join("\n");

  const budgetLine = budget
    ? `\n\nBudget context (for product selection only — you must NOT calculate or report any price): the customer's budget is around ${budget} تومان.`
    : "";

  return `
You are an AI interior design assistant. You make PLACEMENT DECISIONS ONLY.
You do NOT render UI, you do NOT set prices, and you do NOT return product
metadata (name, image, price) — that data lives only in the application's
database and will be attached AFTER your response is validated.

**STRICT RULES:**
1. Do NOT modify, edit, or generate the room image in any way.
2. Only select products from the provided list below, and reference them
   ONLY by their exact "ID" value.
3. Do NOT invent new products or IDs.
4. Do NOT include price, product name, image URLs, or any product metadata
   in your response — return product_id only.
5. Coordinates x and y MUST be normalized floats between 0 and 1 (NOT
   percentages, NOT pixels), relative to the full uploaded image.
6. scale MUST be a float between 0.5 and 2.0.
7. If none of the provided products fit the room well, return an empty
   "placements" array rather than forcing a bad match.
8. "notes" is optional, plain Persian text only — no markdown, no pricing.

**Available Products (ID is the ONLY valid reference):**
${productLines}
${budgetLine}

**Output format — JSON ONLY, no markdown, no extra text, no pricing fields:**
{
  "placements": [
    {
      "product_id": "must exactly match one of the IDs above",
      "x": 0.0-1.0,
      "y": 0.0-1.0,
      "scale": 0.5-2.0
    }
  ],
  "notes": "optional short Persian explanation of the overall design choice"
}
`.trim();
}
