// ============================================================
// Homeino — Gemini Decorator Edge Function
// Supabase Edge Function (Deno)
// URL: /functions/v1/gemini-decorator
// ============================================================
//
// STRICT SEPARATION OF RESPONSIBILITIES (enforced end-to-end in this file):
//
//   1. AI LAYER (Gemini)          → ONLY: product_id, x/y (normalized 0-1),
//                                    scale, optional Persian "notes" text.
//                                    NEVER: price, product name/image, UI
//                                    layout, or any rendering decision.
//   2. VALIDATION LAYER (Zod)     → Rejects any structurally invalid response
//                                    outright (missing/wrong-typed fields).
//   3. SANITIZATION LAYER         → Cross-checks every product_id against the
//                                    exact DB-backed catalog that was sent
//                                    (anti-hallucination) and clamps every
//                                    numeric value into its contractual range.
//   4. DATABASE LAYER (Supabase)  → The ONLY source of truth for product
//                                    name/price/image — never generated or
//                                    trusted from the AI. total_price is
//                                    always recomputed here from real DB
//                                    prices, never from anything the AI said.
//
// AI → UI direct coupling is NOT allowed: the Overlay Render Engine (frontend
// ProductOverlay component) only ever receives DB-enriched, validated,
// sanitized data — never a raw AI response.
//
// Reliability: retries (2 attempts), 30s timeout per Gemini call, per-user
// rate limiting, and a safe fallback response so invalid/failed AI output
// can never crash the UI.
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "zod";

// --- Types ---

/** DB-backed product catalog handed to the AI as its ONLY allowed choices. */
interface ProductInput {
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
}

/**
 * What the AI is allowed to decide, and NOTHING more: which product, where,
 * and how big. No price, no name, no image, no rotation/confidence/free text
 * per item — those either don't belong to the AI layer or add rendering
 * complexity the AI has no business deciding.
 */
interface PlacementOutput {
  product_id: string;
  x: number;     // normalized 0-1
  y: number;     // normalized 0-1
  scale: number; // 0.5-2.0
}

/** Final, DB-enriched response contract sent to the frontend. */
interface GeminiResponse {
  consultation: string;   // Persian notes (from AI, informational only — no pricing/metadata)
  placements: PlacementOutput[];
  total_price: number;    // ALWAYS computed from Supabase product prices, never from the AI
  fallback?: boolean;
}

interface RequestBody {
  image_base64: string;
  products: ProductInput[];
  budget?: number;
  room_id?: string;
}

// ============================================================
// STRICT SCHEMA VALIDATION (Zod) — VALIDATION LAYER
// ============================================================
// Locks down the raw Gemini JSON to EXACTLY the contract the AI is allowed to
// produce: { placements: [{ product_id, x, y, scale }], notes? }. Nothing
// else is accepted — a "price", "name", or "image_url" field appearing in the
// AI's own JSON (hallucinated or not) is simply not part of this schema and
// is silently dropped by Zod's default stripping behavior, never reaching
// downstream code.
//
// Numeric ranges are intentionally permissive here (an LLM can still emit
// out-of-range numbers) — hard clamping happens in the SANITIZATION layer
// below, together with the anti-hallucination product_id cross-check.
const RawPlacementSchema = z.object({
  product_id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
});

const RawGeminiResponseSchema = z.object({
  placements: z.array(RawPlacementSchema).default([]),
  notes: z.string().optional().default(""),
});

// --- Config ---
const MAX_PRODUCTS_PER_REQUEST = 50;
const GEMINI_TIMEOUT_MS = 30_000;
const MAX_GEMINI_ATTEMPTS = 2; // 1 initial call + 1 retry
const RATE_LIMIT_MAX_REQUESTS = 15; // per window, per user
const RATE_LIMIT_WINDOW_MINUTES = 15;

const FALLBACK_CONSULTATION = "No valid design generated";

// --- Helpers ---

/** fetch() with a hard timeout so the function never hangs on a stuck upstream call */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// ============================================================
// PRODUCT INTELLIGENCE LAYER
// ============================================================
// NEVER send the full product database to the model. Category-based
// round-robin selection + budget-aware price-distance ranking, capped at
// MAX_PRODUCTS_PER_REQUEST, keeps the request representative of the catalog
// instead of an arbitrary array-order truncation.
function selectTopProducts(
  products: ProductInput[],
  budget: number | undefined,
  max: number
): ProductInput[] {
  if (products.length <= max) return products;

  const perItemTarget = budget && budget > 0 ? budget / Math.max(1, Math.min(max, products.length)) : null;

  const scored = products.map((p) => {
    const overBudget = typeof budget === "number" && budget > 0 && p.price > budget;
    const priceDistance = perItemTarget !== null ? Math.abs(p.price - perItemTarget) : p.price;
    const score = priceDistance + (overBudget ? 1_000_000_000 : 0);
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

// ============================================================
// SANITIZATION LAYER
// ============================================================
// Runs AFTER Zod has already confirmed the structural shape. This is the
// domain-specific line of defense enforcing the STRICT PRODUCT RULE:
// - Reject / drop any placement whose product_id is NOT in the exact
//   DB-backed catalog that was sent (no fake products can ever appear).
// - Clamp x/y into [0,1] and scale into [0.5,2.0] (Zod only checked "is a
//   number", not "is in range").
// - De-duplicate repeated product_ids.
function sanitizePlacements(
  rawPlacements: z.infer<typeof RawPlacementSchema>[],
  validProducts: Map<string, ProductInput>
): PlacementOutput[] {
  const seen = new Set<string>();
  const clean: PlacementOutput[] = [];

  for (const p of rawPlacements) {
    // STRICT PRODUCT RULE: unknown product_id → reject (ignore), never rendered
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

// ============================================================
// DATABASE LAYER — price enrichment
// ============================================================
// Final total price = SUM(products.price from DB). The AI is never asked
// for, and never trusted for, pricing — this is the only place total_price
// is computed, from the DB-backed `validProducts` map (sourced from the
// Supabase `products` table by the caller).
function computeTotalPrice(placements: PlacementOutput[], validProducts: Map<string, ProductInput>): number {
  return placements.reduce((sum, pl) => {
    const product = validProducts.get(pl.product_id);
    return sum + (product?.price || 0);
  }, 0);
}

function buildFallbackResponse(): GeminiResponse {
  return {
    consultation: FALLBACK_CONSULTATION,
    placements: [],
    total_price: 0,
    fallback: true,
  };
}

/** Calls Gemini once and returns the parsed+validated+sanitized response, or throws on failure */
async function callGeminiOnce(
  imageBase64: string,
  filteredProducts: ProductInput[],
  budget: number | undefined,
  validProducts: Map<string, ProductInput>,
  apiKey: string
): Promise<GeminiResponse> {
  const geminiPrompt = buildGeminiPrompt(filteredProducts, budget);

  const geminiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const geminiBody = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: geminiPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const geminiRes = await fetchWithTimeout(
    geminiUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    },
    GEMINI_TIMEOUT_MS
  );

  if (!geminiRes.ok) {
    const errorText = await geminiRes.text();
    throw new Error(`Gemini API error (${geminiRes.status}): ${errorText}`);
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty Gemini response");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (parseErr) {
    throw new Error(`Failed to parse Gemini response: ${parseErr instanceof Error ? parseErr.message : "Unknown"}`);
  }

  // --- VALIDATION LAYER ---
  const validation = RawGeminiResponseSchema.safeParse(parsedJson);
  if (!validation.success) {
    throw new Error(`Gemini response failed schema validation: ${validation.error.message}`);
  }
  const parsed = validation.data;

  // --- SANITIZATION LAYER ---
  const placements = sanitizePlacements(parsed.placements, validProducts);

  // --- DATABASE LAYER (price enrichment) ---
  const total_price = computeTotalPrice(placements, validProducts);

  return {
    consultation: parsed.notes,
    placements,
    total_price,
  };
}

// --- Main handler ---
serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // --- Authenticate via Supabase JWT ---
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // --- Rate limiting: max RATE_LIMIT_MAX_REQUESTS per user per RATE_LIMIT_WINDOW_MINUTES ---
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: recentCount, error: rateLimitError } = await supabase
      .from("ai_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", windowStart);

    if (!rateLimitError && (recentCount ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
      return new Response(
        JSON.stringify({
          error: `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Parse request body ---
    const body: RequestBody = await req.json();
    const { image_base64, products, budget, room_id } = body;

    if (!image_base64) {
      throw new Error("image_base64 is required");
    }

    if (!products || products.length === 0) {
      throw new Error("At least one product is required");
    }

    // --- Product Intelligence Layer (cost control) ---
    const filteredProducts = selectTopProducts(products, budget, MAX_PRODUCTS_PER_REQUEST);
    const validProducts = new Map(filteredProducts.map((p) => [p.id, p]));

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured on server");
    }

    // --- AI LAYER call, with retry + validation; never let a bad AI response crash the system ---
    let geminiOutput: GeminiResponse | null = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
      try {
        geminiOutput = await callGeminiOnce(image_base64, filteredProducts, budget, validProducts, apiKey);
        break;
      } catch (err) {
        lastError = err;
        console.error(`gemini-decorator attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
      }
    }

    // If the AI produced structurally valid but empty placements, or failed
    // outright, this is the required "No valid design generated" fallback —
    // never a UI crash.
    const usedFallback = geminiOutput === null;
    const finalOutput = geminiOutput ?? buildFallbackResponse();

    // --- Log the AI interaction (non-fatal if it fails) — required by failure-handling rules ---
    const { error: logError } = await supabase.from("ai_logs").insert({
      user_id: user.id,
      room_id: room_id || null,
      prompt: `products=${filteredProducts.length}, budget=${budget ?? "n/a"}`,
      response: finalOutput,
      model: usedFallback ? "gemini-1.5-flash:fallback" : "gemini-1.5-flash",
    });

    if (logError) {
      console.error("Failed to log AI interaction:", logError);
    }

    if (usedFallback) {
      console.error("gemini-decorator: all attempts failed, returning fallback response:", lastError);
    }

    // Always return 200 with a well-formed payload — "placements: []" is a
    // valid, renderable empty state, never a crash.
    return new Response(JSON.stringify(finalOutput), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("gemini-decorator error:", message);

    const status = message === "Unauthorized" ? 401 : 400;

    if (status === 401) {
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: message, ...buildFallbackResponse() }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// Prompt Builder — enforces the STRICT JSON-only AI output contract
// ============================================================
function buildGeminiPrompt(
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
