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
}

interface RequestBody {
  image_base64: string;
  products: ProductInput[];
  budget?: number;
  room_id?: string;
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

    // --- Parse request body ---
    const body: RequestBody = await req.json();
    const { image_base64, products, budget, room_id } = body;

    if (!image_base64) {
      throw new Error("image_base64 is required");
    }

    if (!products || products.length === 0) {
      throw new Error("At least one product is required");
    }

    // Max 50 products to avoid token limits
    const filteredProducts = products.slice(0, 50);

    // --- Build Gemini prompt ---
    const geminiPrompt = buildGeminiPrompt(filteredProducts, budget);

    // --- Call Gemini 1.5 Flash ---
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured on server");
    }

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: image_base64 } },
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

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API error (${geminiRes.status}): ${errorText}`);
    }

    const geminiData = await geminiRes.json();

    // --- Parse Gemini response ---
    let geminiOutput: GeminiResponse;
    try {
      const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) {
        throw new Error("Empty Gemini response");
      }
      geminiOutput = JSON.parse(raw);
    } catch (parseErr) {
      throw new Error(
        `Failed to parse Gemini response: ${parseErr instanceof Error ? parseErr.message : "Unknown"}`
      );
    }

    // --- Validate output ---
    if (!geminiOutput.placements || !Array.isArray(geminiOutput.placements)) {
      throw new Error("Gemini returned invalid placements format");
    }

    // --- Log the AI interaction ---
    const { error: logError } = await supabase.from("ai_logs").insert({
      user_id: user.id,
      room_id: room_id || null,
      prompt: geminiPrompt,
      response: geminiOutput,
      model: "gemini-1.5-flash",
    });

    if (logError) {
      console.error("Failed to log AI interaction:", logError);
      // Non-fatal — don't block the response
    }

    return new Response(JSON.stringify(geminiOutput), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("gemini-decorator error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : 400,
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
4. Do NOT create new products — only use the IDs provided.
5. You are not an image generator. You are a product placement advisor.

**Available Products:**
${productLines}
${budgetLine}

**Instructions:**
1. Analyze the room image to determine its style (modern, classic, minimal, industrial, Scandinavian, bohemian, etc.).
2. From the provided product list, select the BEST products that match the room's style and are suitable for placement in the visible room.
3. For each selected product, determine where it should be placed in the room using percentage-based coordinates (x = 0-100% from left, y = 0-100% from top).
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
      "product_id": "uuid-string",
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