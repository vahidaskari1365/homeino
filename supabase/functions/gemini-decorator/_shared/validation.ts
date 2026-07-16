// ============================================================
// Homeino — Shared Validation & Sanitization
// ============================================================
// Zod schemas and sanitization logic shared between the Edge Function
// and (conceptually) the frontend pipeline. Defense in depth.

import { z } from "https://esm.sh/zod@3.23.8";
import type { ProductInput, PlacementOutput } from "./types.ts";

// ---- VALIDATION LAYER (Zod) ----
// Locks the raw AI JSON to EXACTLY the contract the AI is allowed to produce.
export const RawPlacementSchema = z.object({
  product_id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
});

export const RawGeminiResponseSchema = z.object({
  placements: z.array(RawPlacementSchema).default([]),
  notes: z.string().optional().default(""),
});

// ---- Config ----
export const MAX_PRODUCTS_PER_REQUEST = 50;
export const GEMINI_TIMEOUT_MS = 30_000;
export const MAX_GEMINI_ATTEMPTS = 2;
export const RATE_LIMIT_MAX_REQUESTS = 15;
export const RATE_LIMIT_WINDOW_MINUTES = 15;
export const FALLBACK_CONSULTATION = "No valid design generated";

// ---- Helpers ----

/** fetch() with a hard timeout so the function never hangs */
export async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function clamp(value: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// ---- SANITIZATION LAYER ----

/**
 * Runs AFTER Zod has confirmed the structural shape.
 * - Rejects unknown product_ids (anti-hallucination)
 * - Clamps x/y into [0,1] and scale into [0.5,2.0]
 * - De-duplicates repeated product_ids
 */
export function sanitizePlacements(
  rawPlacements: z.infer<typeof RawPlacementSchema>[],
  validProducts: Map<string, ProductInput>
): PlacementOutput[] {
  const seen = new Set<string>();
  const clean: PlacementOutput[] = [];

  for (const p of rawPlacements) {
    if (!validProducts.has(p.product_id)) continue;
    if (seen.has(p.product_id)) continue;
    seen.add(p.product_id);

    clean.push({
      product_id: p.product_id,
      x: clamp(p.x, 0, 1),
      y: clamp(p.y, 0, 1),
      scale: clamp(p.scale, 0.5, 2.0),
    });
  }

  return clean;
}

// ---- DATABASE LAYER — price enrichment ----

/** total_price = SUM(products.price from DB). AI price is NEVER trusted. */
export function computeTotalPrice(placements: PlacementOutput[], validProducts: Map<string, ProductInput>): number {
  return placements.reduce((sum, pl) => {
    const product = validProducts.get(pl.product_id);
    return sum + (product?.price || 0);
  }, 0);
}
