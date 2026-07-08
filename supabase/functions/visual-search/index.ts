import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const AI_TIMEOUT_MS = 30_000;

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
  "colors": ["array of 3-5 Persian color names"],
  "materials": ["array of materials"],
  "visual_description": "brief Persian description"
}

Return ONLY valid JSON, no markdown.
`.trim();
}

function buildSearchQuery(analysis: Record<string, unknown>): string {
  return [analysis.search_keywords, analysis.visual_description].filter(Boolean).join(" ");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { image_base64 } = await req.json();
    if (!image_base64) throw new Error("image_base64 is required");

    const rawSize = Math.round((image_base64.length * 0.75) / (1024 * 1024));
    if (rawSize > 4) throw new Error(`حجم عکس بیش از حد مجاز است (${rawSize}MB).`);

    const imgParts = image_base64.split(",");
    const base64Data = imgParts.length > 1 ? imgParts[1] : image_base64;
    const mimeType = image_base64.includes(":") ? (image_base64.split(":")[1].split(";")[0] || "image/jpeg") : "image/jpeg";
    const ext = mimeType.split("/")[1] || "jpg";

    // Try storage upload, fallback to base64 data URL
    let imageUrl = `data:${mimeType};base64,${base64Data}`;
    try {
      const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const bin = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const name = `visual-search/${crypto.randomUUID()}.${ext}`;
      const { data: up } = await svc.storage.from("inspiration-images").upload(name, bin, { contentType: mimeType, upsert: false });
      if (up) {
        const { data: { publicUrl } } = svc.storage.from("inspiration-images").getPublicUrl(name);
        imageUrl = publicUrl;
      }
    } catch (e) {
      console.error("storage upload failed, using base64 fallback:", e instanceof Error ? e.message : e);
    }

    // Build prompt
    const prompt = buildVisualAnalysisPrompt();

    // Try Zhipu (GLM-4V) directly — skip Gemini since the API key is invalid
    const zhipuApiKey = Deno.env.get("ZHIPU_API_KEY");
    if (!zhipuApiKey) throw new Error("ZHIPU_API_KEY not configured");

    let raw: string | null = null;
    const zhipuModels = ["glm-4v", "glm-4v-plus", "glm-4v-flash"];

    for (const model of zhipuModels) {
      try {
        const res = await fetchWithTimeout(
          "https://open.bigmodel.cn/api/paas/v4/chat/completions",
          {
            method: "POST",
            headers: { "Authorization": `Bearer ${zhipuApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              }],
            }),
          },
          AI_TIMEOUT_MS
        );
        if (res.ok) {
          const data = await res.json();
          raw = data?.choices?.[0]?.message?.content;
          if (raw) break;
        } else {
          const errText = await res.text();
          console.error(`Zhipu model ${model} failed:`, errText);
        }
      } catch (e) {
        console.error(`Zhipu model ${model} error:`, e instanceof Error ? e.message : e);
      }
    }

    if (!raw) throw new Error("All Zhipu models failed to analyze the image");

    let analysis: Record<string, unknown>;
    try { analysis = JSON.parse(raw); } catch { throw new Error("Failed to parse AI response"); }

    const searchQuery = buildSearchQuery(analysis);

    const { data: rpcData } = await supabase.rpc("search_all", { query: searchQuery });
    let products: Record<string, unknown>[] = [];
    if (rpcData) {
      products = ((rpcData as { products: Record<string, unknown>[] }).products || []).slice(0, 20);
    } else {
      const { data: fb } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, category_id, profile_id, rating, attributes")
        .eq("is_active", true)
        .textSearch("search_vector", searchQuery, { config: "simple", type: "websearch" })
        .limit(20);
      products = (fb as Record<string, unknown>[]) || [];
    }

    let catFiltered = products;
    if (analysis.category && products.length > 0) {
      const { data: cat } = await supabase.from("producer_categories").select("id").eq("slug", analysis.category as string).maybeSingle();
      if (cat) {
        const catId = (cat as { id: string }).id;
        const inCat = products.filter(p => p.category_id === catId);
        const outCat = products.filter(p => p.category_id !== catId);
        catFiltered = [...inCat, ...outCat];
      }
    }

    return new Response(JSON.stringify({
      products: catFiltered.slice(0, 20),
      analysis: {
        search_keywords: analysis.search_keywords,
        category: analysis.category,
        style: analysis.style,
        colors: analysis.colors,
        materials: analysis.materials,
        visual_description: analysis.visual_description,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("visual-search error:", message);
    return new Response(JSON.stringify({ error: message, products: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
