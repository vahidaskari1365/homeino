// ============================================================
// Homeino — Gemini Decorator Edge Function (Entry Point)
// Supabase Edge Function (Deno)
// URL: /functions/v1/gemini-decorator
// ============================================================
//
// STRICT SEPARATION OF RESPONSIBILITIES (enforced end-to-end):
//
//   1. AI LAYER (Gemini / Zhipu fallback) → ONLY: product_id, x/y, scale
//   2. VALIDATION LAYER (Zod)              → Rejects structurally invalid responses
//   3. SANITIZATION LAYER                   → Anti-hallucination + clamping
//   4. DATABASE LAYER (Supabase)           → Sole source of truth for price/name/image
//
// Reliability: retries (2 attempts), 30s timeout, per-user rate limiting,
// safe fallback so invalid/failed AI output never crashes the UI.
//
// Modules:
//   _shared/cors.ts           → CORS origin validation (replaces wildcard *)
//   _shared/types.ts          → Shared interfaces
//   _shared/validation.ts     → Zod schemas, sanitization, helpers
//   _shared/productSelection.ts → Budget-aware product selection
//   _shared/aiProviders.ts    → Gemini + Zhipu provider logic
//   _shared/prompt.ts         → Prompt builder
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

import { getCorsHeaders, handleOptions } from "./_shared/cors.ts";
import type { GeminiResponse, RequestBody } from "./_shared/types.ts";
import {
  MAX_GEMINI_ATTEMPTS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MINUTES,
  FALLBACK_CONSULTATION,
} from "./_shared/validation.ts";
import { selectTopProducts } from "./_shared/productSelection.ts";
import { callGeminiOnce, callZhipuOnce } from "./_shared/aiProviders.ts";

function buildFallbackResponse(): GeminiResponse {
  return {
    consultation: FALLBACK_CONSULTATION,
    placements: [],
    total_price: 0,
    fallback: true,
  };
}

// --- Main handler ---
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleOptions(req);
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
    const filteredProducts = selectTopProducts(products, budget);
    const validProducts = new Map(filteredProducts.map((p) => [p.id, p]));

    // --- AI LAYER call, with retry + fallback; never let a bad AI response crash the system ---
    let aiOutput: GeminiResponse | null = null;
    let lastError: unknown = null;

    // Try Gemini first (with retries)
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiApiKey) {
      for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
        try {
          aiOutput = await callGeminiOnce(image_base64, filteredProducts, budget, validProducts, geminiApiKey);
          break;
        } catch (err) {
          lastError = err;
          console.error(`gemini-decorator attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
        }
      }
    } else {
      console.error("GEMINI_API_KEY not configured, skipping Gemini");
    }

    // Fallback: try Zhipu if Gemini failed or key not available
    if (!aiOutput) {
      try {
        console.error("gemini-decorator: trying Zhipu fallback");
        aiOutput = await callZhipuOnce(image_base64, filteredProducts, budget, validProducts);
      } catch (err) {
        lastError = err;
        console.error("Zhipu fallback also failed:", err instanceof Error ? err.message : err);
      }
    }

    // Safe fallback: empty placements never crash the UI
    const usedFallback = aiOutput === null;
    const finalOutput = aiOutput ?? buildFallbackResponse();

    // --- Log the AI interaction (non-fatal if it fails) ---
    const { error: logError } = await supabase.from("ai_logs").insert({
      user_id: user.id,
      room_id: room_id || null,
      prompt: `products=${filteredProducts.length}, budget=${budget ?? "n/a"}`,
      response: finalOutput,
      model: usedFallback ? "gemini-1.5-flash+zhipu:fallback" : finalOutput.placements.length > 0 ? "dynamic" : "gemini-1.5-flash",
    });

    if (logError) {
      console.error("Failed to log AI interaction:", logError);
    }

    if (usedFallback) {
      console.error("gemini-decorator: all providers failed, returning fallback response:", lastError);
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
