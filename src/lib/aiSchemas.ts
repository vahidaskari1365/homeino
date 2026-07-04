// ============================================================
// Homeino — Frontend AI Response Validation Layer
// ============================================================
// Defense-in-depth: the gemini-decorator Edge Function already validates and
// sanitizes its own output with Zod before responding, but the frontend must
// NEVER assume that guarantee holds (network issues, an older cached function
// version, a future refactor, etc.). This schema is the second checkpoint in
// the required pipeline:
//
//   AI OUTPUT → VALIDATION (this file) → SANITIZATION → UI
//
// If validation fails here, callers must fall back to a safe empty state
// instead of passing unknown data into <ProductOverlay />.
// ============================================================

import { z } from "zod";

export const PlacementSchema = z.object({
  product_id: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  scale: z.number().min(0.5).max(1.5),
  rotation: z.number().min(-15).max(15),
  confidence: z.number().min(0).max(1),
  reason: z.string().default(""),
});

export const GeminiDecoratorResponseSchema = z.object({
  consultation: z.string().default(""),
  style: z.string().default("modern"),
  placements: z.array(PlacementSchema).default([]),
  total_price: z.number().default(0),
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
      style: "modern",
      placements: [],
      total_price: 0,
      fallback: true,
    },
  };
}
