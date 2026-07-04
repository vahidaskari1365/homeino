// ============================================================
// Homeino — Gemini Decorator Edge Function
// Supabase Edge Function (Deno)
// URL: /functions/v1/gemini-decorator
// ============================================================
//
// RESPONSIBILITY:
//   - Receives a room image (base64), filtered product list, and user budget
//   - Sends to Gemini 1.5 Flash API securely (API key in env only)
//   - Returns structured JSON: placements, style, consultation, total_price
//
// IMPORTANT:
//   - API key is NEVER exposed to frontend
//   - Does NOT modify or generate room images
//   - Only returns placement coordinates for overlay
//   - AI output is validated + clamped + cross-checked against the
//     product catalog that was actually sent — hallucinated / out-of-range
//     values are dropped, never rendered, never trusted for pricing
//   - Never crashes on bad AI output: always falls back to a safe response
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "zod";

// --- Types ---
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

interface PlacementOutput {
  product_id: string;
  x: number;       // 0-100 (%)
  y: number;       // 0-100 (%)
  scale: number;   // 0.5-1.5
  rotation: number; // -15 to +15
  confidence: number; // 0-1
  reason: string;  // Persian explanation
}

interface GeminiResponse {
  consultation: string;
  style: string;
  placements: PlacementOutput[];
  total_price: number;
  fallback?: boolean;
}

interface RequestBody {
  image_base64: string;
  products: ProductInput[];
  budget?: number;
  room_id?: string;
}

// ============================================================
// STRICT SCHEMA VALIDATION (Zod)
// ============================================================
// Locks down the SHAPE of the raw Gemini JSON before any of it is trusted.
// This is deliberately permissive on numeric RANGES (garbage numbers are
// still possible from an LLM) — range clamping + product-id cross-checking
// happens afterwards in sanitizePlacements()/computeTotalPrice(). Zod's job
// here is to guarantee the required fields exist with the right TYPES, so a
// structurally broken response (missing "placements", wrong types, extra
// prose around the JSON, etc.) is rejected immediately and triggers a retry
// instead of leaking malformed data further down the pipeline.
const RawPlacementSchema = z.object({
  product_id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  rotation: z.number(),
  confidence: z.number(),
  reason: z.string().optional().default(""),
});

const RawGeminiResponseSchema = z.object({
  consultation: z.string().optional().default(""),
  style: z.string().optional().default("modern"),
  placements: z.array(RawPlacementSchema).default([]),
  total_price: z.number().optional().default(0),
});

// --- Config ---
const MAX_PRODUCTS_PER_REQUEST = 50;
const GEMINI_TIMEOUT_MS = 30_000;
const MAX_GEMINI_ATTEMPTS = 2; // 1 initial call + 1 retry
const RATE_LIMIT_MAX_REQUESTS = 15; // per window, per user
const RATE_LIMIT_WINDOW_MINUTES = 15;

const FALLBACK_CONSULTATION =
  "متأسفانه در حال حاضر امکان تحلیل هوشمند تصویر وجود ندارد. لطفاً چند لحظه دیگر دوباره امتحان کنید یا محصولات را به‌صورت دستی در فضای خود تصور کنید.";

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

/**
 * SANITIZATION LAYER — runs AFTER Zod has already confirmed the structural shape.
 * This is the second, domain-specific line of defense:
 * - Drops any placement whose product_id was NOT in the request (anti-hallucination /
 *   Core Product Rule — the AI can only ever reference real, DB-backed products)
 * - Clamps all numeric fields into their contractual ranges (Zod only checked "is a
 *   number", not "is in [0,100]")
 * - De-duplicates repeated product_ids
 */
function sanitizePlacements(
  rawPlacements: z.infer<typeof RawPlacementSchema>[],
  validProducts: Map<string, ProductInput>
): PlacementOutput[] {
  const seen = new Set<string>();
  const clean: PlacementOutput[] = [];

  for (const p of rawPlacements) {
    // CORE PRODUCT RULE: never accept a product that wasn't in the DB-backed list we sent
    if (!validProducts.has(p.product_id)) continue;
    // Avoid duplicate placements for the same product
    if (seen.has(p.product_id)) continue;
    seen.add(p.product_id);

    clean.push({
      product_id: p.product_id,
      x: clamp(p.x, 0, 100),
      y: clamp(p.y, 0, 100),
      scale: clamp(p.scale, 0.5, 1.5),
      rotation: clamp(p.rotation, -15, 15),
      confidence: clamp(p.confidence, 0, 1),
      reason: p.reason?.trim() || "",
    });
  }

  return clean;
}

/** Recompute total price server-side from validated placements — never trust the AI's own sum */
function computeTotalPrice(placements: PlacementOutput[], validProducts: Map<string, ProductInput>): number {
  return placements.reduce((sum, pl) => {
    const product = validProducts.get(pl.product_id);
    return sum + (product?.price || 0);
  }, 0);
}

// ============================================================
// PRODUCT INTELLIGENCE LAYER
// ============================================================
// NEVER send the full product database to the model. Before this ran a naive
// `products.slice(0, MAX)`, which silently dropped anything past index 50 and
// ignored budget/category relevance entirely. This applies a lightweight,
// deterministic heuristic instead:
//   1. Category-based grouping — keep every category represented (round-robin)
//      instead of letting one category dominate the slice.
//   2. Price-range filtering — when a budget is provided, products priced at or
//      under the budget are ranked ahead of over-budget ones.
//   3. Basic similarity ranking — within a category, prefer products whose price
//      is closest to a fair per-item share of the budget (or cheapest-first when
//      no budget is given), as a stand-in for a full similarity/embedding search.
function selectTopProducts(
  products: ProductInput[],
  budget: number | undefined,
  max: number
): ProductInput[] {
  if (products.length <= max) return products;

  const perItemTarget = budget && budget > 0 ? budget / Math.max(1, Math.min(max, products.length)) : null;

  const scored = products.map((p) => {
    const overBudget = typeof budget === "number" && budget > 0 && p.price > budget;
    // Lower score = better. Over-budget items are heavily penalized but not excluded
    // outright (the model may still combine a couple of them meaningfully).
    const priceDistance = perItemTarget !== null ? Math.abs(p.price - perItemTarget) : p.price;
    const score = priceDistance + (overBudget ? 1_000_000_000 : 0);
    return { product: p, score };
  });

  // Group by category to interleave (round-robin) and guarantee category diversity.
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
    if (!addedInRound) break; // exhausted every category
    round++;
  }

  return result;
}

function buildFallbackResponse(): GeminiResponse {
  return {
    consultation: FALLBACK_CONSULTATION,
    style: "modern",
    placements: [],
    total_price: 0,
    fallback: true,
  };
}

/** Calls Gemini once and returns the parsed+validated response, or throws on failure */
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
      maxOutputTokens: 8192,
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

  // --- STRICT SCHEMA VALIDATION (Zod) ---
  // Reject the whole response if it doesn't match the required shape. This is what
  // triggers a retry (or the safe fallback) instead of ever letting a malformed
  // object reach the UI.
  const validation = RawGeminiResponseSchema.safeParse(parsedJson);
  if (!validation.success) {
    throw new Error(`Gemini response failed schema validation: ${validation.error.message}`);
  }
  const parsed = validation.data;

  // --- SANITIZATION LAYER ---
  // AI OUTPUT (Zod-validated) → SANITIZATION (range clamp + anti-hallucination) → caller
  const placements = sanitizePlacements(parsed.placements, validProducts);
  const total_price = computeTotalPrice(placements, validProducts);

  return {
    consultation: parsed.consultation,
    style: parsed.style,
    placements,
    total_price,
  };
}

// --- Main handler ---
serve(async (req: Request) => {
  // CORS headers
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

    // --- Cost control + Product Intelligence Layer ---
    // Never forward the raw, unbounded product list to the model. selectTopProducts()
    // applies category diversity + budget-aware ranking before capping at MAX.
    const filteredProducts = selectTopProducts(products, budget, MAX_PRODUCTS_PER_REQUEST);
    const validProducts = new Map(filteredProducts.map((p) => [p.id, p]));

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured on server");
    }

    // --- Call Gemini with retry + validation; never let a bad AI response crash the system ---
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

    const usedFallback = geminiOutput === null;
    const finalOutput = geminiOutput ?? buildFallbackResponse();

    // --- Log the AI interaction (non-fatal if it fails) ---
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

    // Always return 200 with a well-formed payload — the frontend contract is
    // "placements: []" is a valid, renderable state, never a crash.
    return new Response(JSON.stringify(finalOutput), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("gemini-decorator error:", message);

    const status = message === "Unauthorized" ? 401 : 400;

    // Even on request-level errors (bad input, auth), return a fallback-shaped body
    // when it's not an auth error, so the UI has something safe to render.
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
// Prompt Builder
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
    ? `\n\nBudget constraint: Maximum total budget is ${budget} تومان.`
    : "";

  return `
You are an AI interior design assistant. Your task is to analyze the uploaded room image and recommend furniture/product placements.

**IMPORTANT RULES:**
1. Do NOT modify, edit, or generate the room image in any way.
2. Do NOT generate fake or non-existent product images.
3. Only select products from the provided list below.
4. Do NOT create new products — only use the IDs provided, copied EXACTLY as given.
5. You are not an image generator. You are a product placement advisor.
6. If none of the provided products fit the room well, return an empty "placements" array rather than forcing a bad match.

**Available Products:**
${productLines}
${budgetLine}

**Instructions:**
1. Analyze the room image to determine its style (modern, classic, minimal, industrial, Scandinavian, bohemian, etc.).
2. From the provided product list, select the BEST products that match the room's style and are suitable for placement in the visible room.
3. For each selected product, determine where it should be placed in the room using percentage-based coordinates (x = 0-100% from left, y = 0-100% from top), based on the actual pixel dimensions of the uploaded image.
4. Provide a scale factor (0.5 to 1.5) and rotation (-15 to +15 degrees) for each placement.
5. Assign a confidence score (0-1) for each placement decision.
6. Respect the budget constraint if provided — total_price must not exceed budget.
7. Write the consultation in Persian (فارسی).
8. Write each placement reason in Persian (فارسی).

**Output format (JSON only, no markdown):**
{
  "consultation": "Persian explanation of design recommendations",
  "style": "detected style (e.g., modern, classic)",
  "placements": [
    {
      "product_id": "uuid-string (must exactly match one of the IDs above)",
      "x": 0-100,
      "y": 0-100,
      "scale": 0.5-1.5,
      "rotation": -15 to 15,
      "confidence": 0-1,
      "reason": "Persian explanation for this placement"
    }
  ],
  "total_price": number (sum of selected product prices)
}
`.trim();
}
