import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const AI_TIMEOUT_MS = 25_000;

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

async function uploadToStorage(base64Data: string, mimeType: string, ext: string, prefix: string): Promise<string> {
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const fileName = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await svc.storage.from("inspiration-images").upload(fileName, bytes, { contentType: mimeType, upsert: false });
  if (data) {
    const { data: { publicUrl } } = svc.storage.from("inspiration-images").getPublicUrl(fileName);
    return publicUrl;
  }
  return `data:${mimeType};base64,${base64Data}`;
}

async function callGemini(prompt: string, base64Data: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: base64Data } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.3, topK: 16, topP: 0.9, maxOutputTokens: 1024, responseMimeType: "application/json" },
      }),
    },
    AI_TIMEOUT_MS
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${err}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function callZhipu(prompt: string, imageUrl: string): Promise<string> {
  const apiKey = Deno.env.get("ZHIPU_API_KEY");
  if (!apiKey) throw new Error("ZHIPU_API_KEY not configured");
  const res = await fetchWithTimeout(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "glm-4v",
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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zhipu error: ${err}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty Zhipu response");
  return text;
}

async function analyzeWithFallback(prompt: string, base64Data: string, imageUrl: string): Promise<string> {
  const errors: string[] = [];
  // Try Gemini first
  try {
    return await callGemini(prompt, base64Data);
  } catch (e) {
    errors.push(`Gemini: ${e instanceof Error ? e.message : e}`);
  }
  // Fallback to Zhipu
  try {
    return await callZhipu(prompt, imageUrl);
  } catch (e) {
    errors.push(`Zhipu: ${e instanceof Error ? e.message : e}`);
  }
  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
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
    if (rawSize > 4) throw new Error(`حجم عکس بیش از حد مجاز است (${rawSize}MB). لطفاً عکس کوچک‌تری انتخاب کنید (حداکثر ۴ مگابایت).`);

    const imgParts = image_base64.split(",");
    const base64Data = imgParts.length > 1 ? imgParts[1] : image_base64;
    const mimeType = image_base64.includes(":") ? (image_base64.split(":")[1].split(";")[0] || "image/jpeg") : "image/jpeg";
    const ext = mimeType.split("/")[1] || "jpg";

    const imageUrl = await uploadToStorage(base64Data, mimeType, ext, "visual-search");
    const raw = await analyzeWithFallback(buildVisualAnalysisPrompt(), base64Data, imageUrl);

    let analysis: Record<string, unknown>;
    try { analysis = JSON.parse(raw); } catch { throw new Error("Failed to parse AI response"); }

    const searchQuery = buildSearchQuery(analysis as Parameters<typeof buildSearchQuery>[0]);

    const { data: rpcData } = await supabase.rpc("search_all", { query: searchQuery });
    let products: Record<string, unknown>[] = [];
    if (rpcData) {
      products = ((rpcData as { products: Record<string, unknown>[] }).products || []).slice(0, 20);
    } else {
      const { data: fallbackData } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, category_id, profile_id, rating, attributes")
        .eq("is_active", true)
        .textSearch("search_vector", searchQuery, { config: "simple", type: "websearch" })
        .limit(20);
      products = (fallbackData as Record<string, unknown>[]) || [];
    }

    let categoryFiltered = products;
    if (analysis.category && products.length > 0) {
      const { data: catData } = await supabase.from("producer_categories").select("id").eq("slug", analysis.category as string).maybeSingle();
      if (catData) {
        const catId = (catData as { id: string }).id;
        const inCat = products.filter((p) => p.category_id === catId);
        const outCat = products.filter((p) => p.category_id !== catId);
        categoryFiltered = [...inCat, ...outCat];
      }
    }

    return new Response(JSON.stringify({
      products: categoryFiltered.slice(0, 20),
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
