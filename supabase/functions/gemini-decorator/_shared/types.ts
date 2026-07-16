// ============================================================
// Homeino — Shared Types for gemini-decorator Edge Function
// ============================================================

/** DB-backed product catalog handed to the AI as its ONLY allowed choices. */
export interface ProductInput {
  id: string;
  name: string;
  category: string;
  style: string;
  price: number;
  width?: number;
  height?: number;
  depth?: number;
  image_url?: string;
  tags?: string[];
  /** DB-sourced only (products.is_featured) — informs which of several
   *  near-equally relevant products are OFFERED to Gemini for consideration.
   *  Never overrides quality/relevance; only breaks near-ties. Gemini itself
   *  still only ever decides placement, never sees or reasons about this flag. */
  is_featured?: boolean;
}

/**
 * What the AI is allowed to decide, and NOTHING more: which product, where,
 * and how big. No price, no name, no image, no rotation/confidence/free text
 * per item.
 */
export interface PlacementOutput {
  product_id: string;
  x: number;     // normalized 0-1
  y: number;     // normalized 0-1
  scale: number; // 0.5-2.0
}

/** Final, DB-enriched response contract sent to the frontend. */
export interface GeminiResponse {
  consultation: string;   // Persian notes (from AI, informational only)
  placements: PlacementOutput[];
  total_price: number;    // ALWAYS computed from Supabase product prices
  fallback?: boolean;
}

export interface RequestBody {
  image_base64: string;
  products: ProductInput[];
  budget?: number;
  room_id?: string;
}
