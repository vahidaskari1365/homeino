// ============================================================
// Homeino — Frontend AI Response Validation Layer
// ============================================================
// Defense-in-depth: the gemini-decorator Edge Function already validates and
// sanitizes its own output with Zod before responding, but the frontend must
// NEVER assume that guarantee holds (network issues, an older cached function
// version, a future refactor, etc.). This schema is the second checkpoint in
// the required pipeline:
//
//   AI OUTPUT → VALIDATION (edge fn) → DB ENRICHMENT → VALIDATION (this file) → UI
//
// Strict separation of responsibilities enforced by this schema:
// - The AI layer may ONLY ever contribute product_id + normalized x/y/scale.
// - There is NO price, name, image, or style field here — those always come
//   from Supabase (via `productsMap` in the UI layer), never from the AI.
// - `total_price` is a server-computed (DB-sourced) aggregate, not an AI value.
//
// If validation fails here, callers must fall back to a safe empty state
// instead of passing unknown data into <ProductOverlay />.
// ============================================================

import { z } from "zod";

export const PlacementSchema = z.object({
  product_id: z.string().min(1),
  x: z.number().min(0).max(1),       // normalized 0-1
  y: z.number().min(0).max(1),       // normalized 0-1
  scale: z.number().min(0.5).max(2), // 0.5-2.0
});

export const GeminiDecoratorResponseSchema = z.object({
  consultation: z.string().default(""),
  placements: z.array(PlacementSchema).default([]),
  total_price: z.number().default(0), // DB-computed only, never trust an AI number
  fallback: z.boolean().optional(),
});

export type ValidatedGeminiResponse = z.infer<typeof GeminiDecoratorResponseSchema>;

/**
 * Validates + sanitizes a raw Edge Function payload. Never throws — always
 * returns a safe, renderable object so the UI can never crash on bad AI
 * output. `ok: false` signals the caller should show the empty/error state.
 */
export function validateGeminiResponse(raw: unknown): { ok: boolean; data: ValidatedGeminiResponse } {
  const result = GeminiDecoratorResponseSchema.safeParse(raw);
  if (result.success) {
    return { ok: !result.data.fallback && result.data.placements.length > 0, data: result.data };
  }
  return {
    ok: false,
    data: {
      consultation: "متأسفانه پاسخ سرور نامعتبر بود. لطفاً دوباره تلاش کنید.",
      placements: [],
      total_price: 0,
      fallback: true,
    },
  };
}
