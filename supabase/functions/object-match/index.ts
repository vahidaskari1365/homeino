import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const GEMINI_TIMEOUT_MS = 25_000;
const SEARCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildDetectionPrompt(): string {
  return `
You are an AI interior design analyst. Analyze this image and identify EVERY individual furniture and decor object visible.

For each object, return:
1. "label": Persian or English object name (e.g., "مبل راحتی", "میز جلو مبلی", "لوستر", "فرش", "پرده", etc.)
2. "category": one of: furniture, curtain, carpet, lighting, bedding, plants, art, wood-decor, accessories
3. "style": one of: modern, classic, minimalist, industrial, scandinavian, luxury, bohemian, japanese, or null
4. "confidence": 0.0-1.0
5. "colors": array of 2-4 Persian color names
6. "materials": array of materials (e.g., ["چوب", "فلز", "پارچه"])
7. "description": brief Persian description of the object's visual appearance

Also return the overall:
- "room_type": living, bedroom, kitchen, bathroom, office, dining, outdoor, or null
- "overall_style": dominant style of the space

Rules:
- Detect EVERY distinct object. Do NOT merge objects.
- A sofa and a coffee table are separate objects.
- Curtains, rug, lamp are separate objects.
- Wall art, mirror, plants are separate objects.
- If uncertain about an object, include it with lower confidence.
- Use Homeino category slugs for "category".
- Support ALL current and future Homeino categories — never hardcode.

Return ONLY valid JSON:
{
  "objects": [
    {
      "label": "...",
      "category": "... or null",
      "style": "... or null",
      "confidence": 0.0-1.0,
      "colors": ["..."],
      "materials": ["..."],
      "description": "..."
    }
  ],
  "room_type": "... or null",
  "overall_style": "... or null"
}
`.trim();
}

interface DetectedObject {
  label: string;
  category: string | null;
  style: string | null;
  confidence: number;
  colors: string[];
  materials: string[];
  description: string;
}

interface DetectionResponse {
  objects: DetectedObject[];
  room_type: string | null;
  overall_style: string | null;
}

interface ProductMatch {
  product_id: string;
  product_name: string;
  price: number | null;
  image_url: string | null;
  store_id: string | null;
  store_name: string | null;
  category: string;
  style: string;
  tags: string[];
  confidence: number;
  match_reason: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  furniture: ["مبل", "صندلی", "میز", "کمد", "قفسه", "تخت", "نیمکت", "sofa", "chair", "table", "cabinet", "shelf", "bed", "desk", "bench"],
  curtain: ["پرده", "curtain", "drapery"],
  carpet: ["فرش", "قالی", "موکت", "گلیم", "carpet", "rug"],
  lighting: ["لوستر", "چراغ", "آباژور", "لامپ", "لایت", "lamp", "chandelier", "light"],
  bedding: ["تشک", "بالش", "ملحفه", "پتو", "mattress", "pillow", "bedding", "blanket"],
  plants: ["گلدان", "گیاه", "flower", "plant", "pot"],
  art: ["تابلو", "نقاشی", "آینه", "painting", "mirror", "art", "frame"],
  "wood-decor": ["دکور چوبی", "wood", "wooden"],
  accessories: ["اکسسوری", "دکوری", "گلدان", "مجسمه", "ساعت", "accessory", "vase", "decor"],
};

function guessCategory(label: string): string | null {
  const lower = label.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return null;
}

async function searchProductsForObject(
  supabase: ReturnType<typeof createClient>,
  obj: DetectedObject,
  overallStyle: string | null
): Promise<ProductMatch[]> {
  const category = obj.category || guessCategory(obj.label);
  const searchTerms = [obj.label, obj.description, (obj.colors || []).join(" "), ...(obj.materials || [])]
    .filter(Boolean)
    .join(" ");

  const style = obj.style || overallStyle;

  // Try search RPC first
  const { data: rpcData } = await supabase.rpc("search_all", { query: searchTerms });
  let products: Record<string, unknown>[] = [];

  if (rpcData) {
    const res = rpcData as { products: Record<string, unknown>[] };
    products = (res.products || []).slice(0, 10);
  }

  if (products.length === 0) {
    const { data: fallback } = await supabase
      .from("products")
      .select("id, name, price, image_url, profile_id, category_id, style, tags, description, rating")
      .eq("is_active", true)
      .not("image_url", "is", null)
      .textSearch("name", searchTerms, { config: "simple", type: "websearch" })
      .limit(10);
    products = (fallback as Record<string, unknown>[]) || [];
  }

  // If still no results, get products by category
  if (products.length === 0 && category) {
    const { data: catData } = await supabase
      .from("producer_categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();
    if (catData) {
      const { data: catProds } = await supabase
        .from("products")
        .select("id, name, price, image_url, profile_id, category_id, style, tags, description, rating")
        .eq("is_active", true)
        .eq("category_id", (catData as { id: string }).id)
        .not("image_url", "is", null)
        .limit(10);
      products = (catProds as Record<string, unknown>[]) || [];
    }
  }

  // Enrich with store name and compute confidence
  const matches: ProductMatch[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let storeName: string | null = null;
    if (p.profile_id) {
      const { data: profile } = await supabase
        .from("public_profiles")
        .select("brand_name")
        .eq("id", p.profile_id as string)
        .maybeSingle();
      if (profile) storeName = (profile as { brand_name: string }).brand_name;
    }

    const baseConfidence = Math.max(0, 70 - i * 5);
    const styleBoost = style && p.style && String(p.style).toLowerCase() === style.toLowerCase() ? 15 : 0;
    const finalConfidence = Math.min(98, baseConfidence + styleBoost);

    matches.push({
      product_id: String(p.id),
      product_name: String(p.name || ""),
      price: p.price ? Number(p.price) : null,
      image_url: p.image_url ? String(p.image_url) : null,
      store_id: p.profile_id ? String(p.profile_id) : null,
      store_name: storeName,
      category: String(p.category_id || ""),
      style: String(p.style || ""),
      tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
      confidence: finalConfidence,
      match_reason: styleBoost > 0 ? "سبک و دسته مشابه" : "دسته مشابه",
    });
  }

  return matches;
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

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    const { image_base64 } = await req.json();
    if (!image_base64) throw new Error("image_base64 is required");

    const apiKey = Deno.env.get("ZHIPU_API_KEY");
    if (!apiKey) throw new Error("ZHIPU_API_KEY not configured");

    const base64Data = image_base64.includes(",") ? image_base64.split(",")[1] : image_base64;

    // Check cache: hash the image and look up in reference_images
    const imageHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(base64Data.slice(0, 1000)));
    const hashArray = Array.from(new Uint8Array(imageHash));
    const cacheKey = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    let cachedDetection: DetectionResponse | null = null;
    if (user) {
      const { data: cached } = await supabase
        .from("reference_images")
        .select("ai_analysis")
        .eq("id", cacheKey.slice(0, 36))
        .maybeSingle();
      if (cached && cached.ai_analysis && typeof cached.ai_analysis === "object") {
        const analysis = cached.ai_analysis as Record<string, unknown>;
        if (analysis.objects && Array.isArray(analysis.objects)) {
          cachedDetection = analysis as unknown as DetectionResponse;
        }
      }
    }

    // Step 1: Detect objects via Zhipu (GLM-4V)
    if (!cachedDetection) {
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
                { type: "text", text: buildDetectionPrompt() },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
              ],
            }],
          }),
        },
        GEMINI_TIMEOUT_MS
      );

      if (!zhipuRes.ok) {
        const errText = await zhipuRes.text();
        throw new Error(`Zhipu API error (${zhipuRes.status}): ${errText}`);
      }

      const zhipuData = await zhipuRes.json();
      const raw = zhipuData?.choices?.[0]?.message?.content;
      if (!raw) throw new Error("Empty Zhipu response");

      try {
        cachedDetection = JSON.parse(raw);
      } catch {
        throw new Error("Failed to parse Zhipu detection response");
      }

      // Cache in reference_images if user is authenticated
      if (user && cachedDetection) {
        await supabase.from("reference_images").insert({
          id: cacheKey.slice(0, 36),
          user_id: user.id,
          image_url: `data:image/jpeg;base64,${base64Data.slice(0, 50)}...`,
          source: "paste",
          ai_analysis: cachedDetection as unknown as Record<string, unknown>,
          ai_processed: true,
          ai_processed_at: new Date().toISOString(),
        }).select().maybeSingle();
      }
    }

    if (!cachedDetection) throw new Error("Object detection failed");

    // Step 2: For each detected object, search matching products in parallel
    const matchPromises = cachedDetection.objects.map((obj) =>
      searchProductsForObject(supabase, obj, cachedDetection!.overall_style)
    );
    const allMatches = await Promise.all(matchPromises);

    // Step 3: Build final response
    const objectsWithMatches = cachedDetection.objects.map((obj, i) => ({
      ...obj,
      matches: allMatches[i] || [],
    }));

    return new Response(
      JSON.stringify({
        objects: objectsWithMatches,
        room_type: cachedDetection.room_type,
        overall_style: cachedDetection.overall_style,
        object_count: cachedDetection.objects.length,
        total_products: allMatches.reduce((s, m) => s + m.length, 0),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("object-match error:", message);
    return new Response(JSON.stringify({ error: message, objects: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
