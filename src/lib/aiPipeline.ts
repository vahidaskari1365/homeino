// ============================================================
// Homeino — AI Design Response Pipeline (Frontend)
// ============================================================
// This is THE single, mandatory, testable entry point between "whatever the
// gemini-decorator Edge Function returned" and "what the UI is allowed to
// render". No other code path may hand an AI response to <ProductOverlay />.
//
// ENFORCED FLOW (any other flow is invalid):
//
//   AI OUTPUT → VALIDATION → SANITIZATION → NORMALIZATION
//             → DATABASE ENRICHMENT → (caller renders) UI RENDER ENGINE
//
// Absolute rules enforced here, independent of whether the Edge Function
// already enforced them (defense in depth — this file NEVER assumes the
// server is correct):
//   - AI price is COMPLETELY ignored. total_price is always recomputed as
//     SUM(products.price) from the DB-backed product map passed in.
//   - AI can only ever reference product_id values present in that DB-backed
//     map. Any unknown id is rejected outright, never rendered.
//   - Every numeric field is clamped into its contractual range.
//   - A structurally invalid or empty response never throws — it always
//     resolves to a safe, renderable PipelineResult.
// ============================================================

import { z } from "zod";

// ---- Layer 1: VALIDATION ----------------------------------------------
// Locks the raw AI payload to EXACTLY the contract the Edge Function (and,
// transitively, Gemini) is allowed to produce. Unknown fields are stripped
// by Zod's default behavior and never reach later layers.
const RawPlacementSchema = z.object({
  product_id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
});

const RawAIResponseSchema = z.object({
  consultation: z.string().default(""),
  placements: z.array(RawPlacementSchema).default([]),
  // Intentionally accepted-but-ignored: some upstream payload might still
  // include a total_price (e.g. an older cached function version). It is
  // parsed only so validation doesn't reject the envelope — it is NEVER
  // read or trusted anywhere below.
  total_price: z.number().optional(),
  fallback: z.boolean().optional(),
});

export interface DBProduct {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
}

/** A placement that has passed sanitization + normalization and been
 *  enriched with real DB product data. This is the ONLY shape the UI
 *  Render Engine is allowed to consume. */
export interface EnrichedPlacement<TProduct extends DBProduct> {
  product_id: string;
  /** Normalized 0-1 coordinates (NORMALIZATION layer output) */
  xNorm: number;
  yNorm: number;
  scale: number;
  /** DATABASE ENRICHMENT layer output — the full DB record, never AI data */
  product: TProduct;
}

export type PipelineStatus = "ok" | "empty" | "invalid";

export interface PipelineResult<TProduct extends DBProduct> {
  /** "ok" = at least one valid placement to render.
   *  "empty" = well-formed AI response but nothing survived sanitization.
   *  "invalid" = the AI payload failed schema validation outright. */
  status: PipelineStatus;
  consultation: string;
  /** ALWAYS SUM(product.price) over the enriched placements — never an AI value */
  totalPrice: number;
  placements: EnrichedPlacement<TProduct>[];
}

function clamp(value: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function safeFallback<TProduct extends DBProduct>(status: "invalid" | "empty", consultation = ""): PipelineResult<TProduct> {
  return { status, consultation, totalPrice: 0, placements: [] };
}

/**
 * Runs the full AI OUTPUT → VALIDATION → SANITIZATION → NORMALIZATION →
 * DATABASE ENRICHMENT pipeline. Never throws.
 *
 * @param raw          The raw payload returned by the gemini-decorator Edge Function.
 * @param dbProducts   The EXACT DB-backed product map that was offered to the AI
 *                      (e.g. the user's selected products, keyed by id). This is
 *                      the only source of truth for name/price/image and for
 *                      which product_ids are considered valid.
 */
export function runAIDesignPipeline<TProduct extends DBProduct>(
  raw: unknown,
  dbProducts: Record<string, TProduct>
): PipelineResult<TProduct> {
  // ---- VALIDATION ----
  const validation = RawAIResponseSchema.safeParse(raw);
  if (!validation.success) {
    return safeFallback("invalid", "پاسخ هوش مصنوعی نامعتبر بود.");
  }
  const parsed = validation.data;

  if (parsed.fallback) {
    // The server itself already degraded to a fallback — pass that through
    // as "empty" rather than pretending it succeeded.
    return safeFallback("empty", parsed.consultation || "طراحی معتبری تولید نشد.");
  }

  // ---- SANITIZATION ----
  // Strict Product ID Security Lock: unknown product_id → rejected, never
  // rendered, never replaced with a made-up product.
  const seen = new Set<string>();
  const sanitized = parsed.placements.filter((p) => {
    if (!dbProducts[p.product_id]) return false;
    if (seen.has(p.product_id)) return false;
    seen.add(p.product_id);
    return true;
  });

  // ---- NORMALIZATION ----
  // Guarantee every coordinate/scale is a well-formed value in its
  // contractual range, in the canonical 0-1 normalized unit. Actual
  // pixel conversion happens later, at render time, inside the Overlay
  // Render Engine (it depends on the live, responsive image size — it
  // cannot be baked in once here).
  const normalized = sanitized.map((p) => ({
    product_id: p.product_id,
    xNorm: clamp(p.x, 0, 1),
    yNorm: clamp(p.y, 0, 1),
    scale: clamp(p.scale, 0.5, 2.0),
  }));

  // ---- DATABASE ENRICHMENT ----
  // Attach the REAL product record from Supabase. Price is NEVER taken from
  // the AI response — total is summed here, purely from DB data.
  const enriched: EnrichedPlacement<TProduct>[] = normalized.map((p) => ({
    ...p,
    product: dbProducts[p.product_id],
  }));

  const totalPrice = enriched.reduce((sum, p) => sum + (p.product.price || 0), 0);

  if (enriched.length === 0) {
    return {
      status: "empty",
      consultation: parsed.consultation || "طراحی معتبری از میان محصولات انتخابی تولید نشد.",
      totalPrice: 0,
      placements: [],
    };
  }

  return {
    status: "ok",
    consultation: parsed.consultation,
    totalPrice,
    placements: enriched,
  };
}
