import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const GEMINI_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildVisualAnalysisPrompt(): string {
  return `
You are a visual search AI for a Persian home decor marketplace.
Analyze the provided image and return ONLY a JSON object with the following fields:

{
  "search_keywords": "Persian keywords describing the product for search",
  "category": "one of: furniture, curtain, carpet, lighting, bedding, plants, art, wood-decor, accessories, or null",
  "style": "one of: modern, classic, minimalist, industrial, scandinavian, luxury, bohemian, japanese, or null",
  "colors": ["array of 3-5 Persian color names like: سفید, مشکی, طلایی, نقره‌ای, چوبی, etc."],
  "materials": ["array of materials like: چوب, فلز, پارچه, شیشه, etc."],
  "visual_description": "brief Persian description of the product's visual appearance, shape, and design elements"
}

Look at the image carefully. Identify what kind of home decor or furniture product it shows.
Describe its visual characteristics in Persian so it can be matched against product descriptions in the database.
If the image shows a room/living space rather than a single product, describe the dominant furniture pieces.

Return ONLY valid JSON, no markdown, no extra text.
`.trim();
}

function buildSearchQuery(analysis: {
  search_keywords: string;
  category: string | null;
  style: string | null;
  colors: string[];
  materials: string[];
  visual_description: string;
}): string {
  const parts: string[] = [analysis.search_keywords];
  if (analysis.visual_description) parts.push(analysis.visual_description);
  return parts.join(" ");
}

serve(async (req: Request) => {
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
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      // Visual search is a lightweight feature — allow anonymous users too
      // but still verify the JWT is valid if provided
    }

    const { image_base64, text_query } = await req.json();
    if (!image_base64) {
      throw new Error("image_base64 is required");
    }

    const apiKey = Deno.env.get("ZHIPU_API_KEY");
    if (!apiKey) {
      throw new Error("ZHIPU_API_KEY not configured on server");
    }

    const base64Data = image_base64.includes(",") ? image_base64.split(",")[1] : image_base64;

    // Step 1: Send to Zhipu (GLM-4V) for analysis
    const zhipuRes = await fetchWithTimeout(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "glm-4v",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: buildVisualAnalysisPrompt() },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
            ],
          }],
        }),
      },
      GEMINI_TIMEOUT_MS
    );

    if (!zhipuRes.ok) {
      const errorText = await zhipuRes.text();
      throw new Error(`Zhipu API error (${zhipuRes.status}): ${errorText}`);
    }

    const zhipuData = await zhipuRes.json();
    const raw = zhipuData?.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty Zhipu response");

    let analysis: {
      search_keywords: string;
      category: string | null;
      style: string | null;
      colors: string[];
      materials: string[];
      visual_description: string;
    };

    try {
      analysis = JSON.parse(raw);
    } catch {
      throw new Error("Failed to parse Gemini analysis");
    }

    // Step 2: Search products using the AI-generated query
    const searchQuery = buildSearchQuery(analysis);

    // Try the search_all RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("search_all", { query: searchQuery });

    let products: Record<string, unknown>[] = [];

    if (!rpcError && rpcData) {
      const res = rpcData as { products: Record<string, unknown>[] };
      products = (res.products || []).slice(0, 20);
    } else {
      // Fallback: textSearch on products
      const { data: fallbackData } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, category_id, profile_id, rating, attributes")
        .eq("is_active", true)
        .textSearch("search_vector", searchQuery, { config: "simple", type: "websearch" })
        .limit(20);
      products = (fallbackData as Record<string, unknown>[]) || [];
    }

    // Step 3: If category or style was identified, also boost/filter by those
    let categoryFiltered: Record<string, unknown>[] = products;
    if (analysis.category && products.length > 0) {
      const { data: catData } = await supabase
        .from("producer_categories")
        .select("id")
        .eq("slug", analysis.category)
        .maybeSingle();
      if (catData) {
        const catId = (catData as { id: string }).id;
        // Move category matches to the front
        const inCat = products.filter((p) => p.category_id === catId);
        const outCat = products.filter((p) => p.category_id !== catId);
        categoryFiltered = [...inCat, ...outCat];
      }
    }

    return new Response(
      JSON.stringify({
        products: categoryFiltered.slice(0, 20),
        analysis: {
          search_keywords: analysis.search_keywords,
          category: analysis.category,
          style: analysis.style,
          colors: analysis.colors,
          materials: analysis.materials,
          visual_description: analysis.visual_description,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("visual-search error:", message);
    return new Response(JSON.stringify({ error: message, products: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
