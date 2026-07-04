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
 * Validates raw AI placements against the exact product catalog that was sent.
 * - Drops any placement whose product_id was NOT in the request (anti-hallucination)
 * - Clamps all numeric fields into their contractual ranges
 * - Skips malformed entries instead of throwing
 */
function sanitizePlacements(
  rawPlacements: unknown,
  validProducts: Map<string, ProductInput>
): PlacementOutput[] {
  if (!Array.isArray(rawPlacements)) return [];

  const seen = new Set<string>();
  const clean: PlacementOutput[] = [];

  for (const raw of rawPlacements) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const productId = typeof p.product_id === "string" ? p.product_id : null;

    // CORE PRODUCT RULE: never accept a product that wasn't in the DB-backed list we sent
    if (!productId || !validProducts.has(productId)) continue;
    // Avoid duplicate placements for the same product
    if (seen.has(productId)) continue;
    seen.add(productId);

    clean.push({
      product_id: productId,
      x: clamp(Number(p.x), 0, 100),
      y: clamp(Number(p.y), 0, 100),
      scale: clamp(Number(p.scale), 0.5, 1.5),
      rotation: clamp(Number(p.rotation), -15, 15),
      confidence: clamp(Number(p.confidence), 0, 1),
      reason: typeof p.reason === "string" && p.reason.trim() ? p.reason.trim() : "",
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    throw new Error(`Failed to parse Gemini response: ${parseErr instanceof Error ? parseErr.message : "Unknown"}`);
  }

  const placements = sanitizePlacements(parsed.placements, validProducts);
  const total_price = computeTotalPrice(placements, validProducts);

  return {
    consultation: typeof parsed.consultation === "string" ? parsed.consultation : "",
    style: typeof parsed.style === "string" ? parsed.style : "modern",
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

    // --- Cost control: cap products sent to the model, prefer cheapest-first-truncation is
    //     arbitrary — since callers already send a user-curated selection, capping simply
    //     protects against token blowups on abusive payloads.
    const filteredProducts = products.slice(0, MAX_PRODUCTS_PER_REQUEST);
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
