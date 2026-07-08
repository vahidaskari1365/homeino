import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const AI_TIMEOUT = 20_000

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().substring(0, 200)
}

function estimateReadingTime(text: string): number {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200))
}

function detectContentType(title: string, description: string): string {
  const lower = (title + " " + description).toLowerCase()
  if (/\b(video|review|unboxing|tour)\b/i.test(lower)) return "video"
  if (/\b(comparison|vs\.?|versus|compare|alternative)\b/i.test(lower)) return "product_comparison"
  if (/\b(buying guide|best |top \d|ultimate guide|what to look for|purchase|shop)\b/i.test(lower)) return "buying_guide"
  if (/\b(how to|step by step|diy|tutorial|guide|tips|advice|learn)\b/i.test(lower)) return "design_guide"
  if (/\b(before and after|before & after|makeover|transformation|renovation)\b/i.test(lower)) return "before_after"
  if (/\b(project|showcase|case study|client|completed|installed)\b/i.test(lower)) return "project_showcase"
  if (/\b(trend|2026|2025|forecast|what's in|what is in|emerging|popular now)\b/i.test(lower)) return "trending_designs"
  if (/\b(color|palette|hue|shade|paint)\b/i.test(lower)) return "color_guides"
  if (/\b(material|fabric|wood|stone|marble|fabric|leather)\b/i.test(lower)) return "material_guides"
  if (/\b(furniture|sofa|table|chair|cabinet|shelf|bed)\b/i.test(lower)) return "furniture_guide"
  if (/\b(curtain|drape|blind|shade|window treatment)\b/i.test(lower)) return "curtain_guide"
  if (/\b(light|lamp|chandelier|pendant|sconce|illumination)\b/i.test(lower)) return "lighting_guide"
  if (/\b(decor|decoration|accessorize|styling|ornament)\b/i.test(lower)) return "decoration_guide"
  if (/\b(designer pick|designer choice|editor pick|staff pick|curated)\b/i.test(lower)) return "designer_picks"
  if (/\b(construction|building|renovate|remodel|structural)\b/i.test(lower)) return "construction_tips"
  if (/\b(seasonal|spring|summer|fall|winter|holiday|festive)\b/i.test(lower)) return "seasonal_collections"
  if (/\b(faq|questions|answers|common question)\b/i.test(lower)) return "faq"
  if (/\b(news|announcement|launch|event|exhibition|fair)\b/i.test(lower)) return "news"
  if (/\b(service|installation|consultation|maintenance|repair)\b/i.test(lower)) return "service_guide"
  return "inspiration"
}

async function callGeminiText(prompt: string): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY")
  if (!key) throw new Error("GEMINI_API_KEY not set")
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  )
  if (!res.ok) { const t = await res.text(); throw new Error(`Gemini: ${t}`) }
  const d = await res.json()
  return d?.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

async function callZhipuText(prompt: string): Promise<string> {
  const key = Deno.env.get("ZHIPU_API_KEY")
  if (!key) throw new Error("ZHIPU_API_KEY not set")
  const res = await fetch(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "glm-4", messages: [{ role: "user", content: prompt }] }) }
  )
  if (!res.ok) { const t = await res.text(); throw new Error(`Zhipu: ${t}`) }
  const d = await res.json()
  return d?.choices?.[0]?.message?.content || ""
}

async function callAI(prompt: string): Promise<Record<string, unknown>> {
  const errors: string[] = []
  for (const fn of [callGeminiText, callZhipuText]) {
    try {
      const raw = await fn(prompt)
      const cleaned = raw.replace(/```json|```/gi, "").trim()
      return JSON.parse(cleaned)
    } catch (e) { errors.push(e instanceof Error ? e.message : String(e)) }
  }
  console.error("All AI providers failed:", errors.join(" | "))
  return {}
}

async function downloadAndUpload(url: string, supabase: ReturnType<typeof createClient>, prefix: string): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) { console.error(`download failed ${url}: ${res.status}`); return url }
    const blob = await res.blob()
    const ext = url.split(".").pop()?.split("?")[0] || "jpg"
    const name = `${prefix}/${crypto.randomUUID()}.${ext}`
    const { data } = await supabase.storage.from("inspiration-images").upload(name, blob, { contentType: blob.type || `image/${ext}`, upsert: false })
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from("inspiration-images").getPublicUrl(name)
      return publicUrl
    }
  } catch (e) { console.error(`upload error for ${url}:`, e instanceof Error ? e.message : e) }
  return url
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

    const body = await req.json()
    const items = Array.isArray(body) ? body : [body]
    const results = []

    for (const item of items) {
      const { title = "", description = "", image_url = "", gallery = [], source_url = "", source_name = "" } = item

      if (!title || !image_url) {
        results.push({ error: "title and image_url required", item })
        continue
      }

      if (source_url) {
        const { data: existing } = await supabase.from("inspirations").select("id").eq("source_url", source_url).maybeSingle()
        if (existing) { results.push({ id: existing.id, status: "skipped", reason: "duplicate" }); continue }
      }

      const storedImageUrl = await downloadAndUpload(image_url, supabase, "content-hub")
      const storedGallery = await Promise.all(gallery.slice(0, 10).map((u: string) => downloadAndUpload(u, supabase, "content-hub-gallery")))

      let aiResult: Record<string, unknown> = {}
      const prompt = `
You are a Persian interior design content writer for Homeino.
Rewrite this article in Persian and extract metadata.

Original title: ${title}
Original description: ${description}
Source: ${source_name}

Return ONLY valid JSON:
{
  "title_fa": "Persian SEO title",
  "summary": "2-3 sentence Persian summary",
  "description_fa": "3-5 paragraph Persian article body",
  "style": "modern|classic|minimal|luxury|traditional|industrial|scandinavian|bohemian|contemporary|rustic|art_deco|mid_century|japandi|eclectic",
  "room_type": "living|bedroom|kitchen|bathroom|office|dining|outdoor|hallway|balcony|kids",
  "tags": ["5-8 Persian tags"],
  "color_palette": ["5 hex colors"],
  "materials": ["3-5 materials in Persian"],
  "seo_title": "max 60 chars, Persian",
  "seo_description": "max 160 chars, Persian"
}
`
      aiResult = await callAI(prompt)

      const finalTitleFa = (aiResult.title_fa as string) || ""
      const finalSummary = (aiResult.summary as string) || description.substring(0, 300)
      const finalDescriptionFa = (aiResult.description_fa as string) || ""

      const contentItem = {
        title,
        title_fa: finalTitleFa || title,
        description: description.substring(0, 2000),
        description_fa: finalDescriptionFa || finalSummary,
        summary: finalSummary,
        image_url: storedImageUrl,
        gallery: storedGallery.filter(Boolean).length > 0 ? storedGallery.filter(Boolean) : null,
        content_type: detectContentType(title, description),
        slug: slugify(finalTitleFa || title),
        style: (aiResult.style as string) || null,
        room_type: (aiResult.room_type as string) || null,
        tags: (aiResult.tags as string[]) || [],
        materials: (aiResult.materials as string[]) || [],
        color_palette: (aiResult.color_palette as string[]) ?? null,
        source_url: source_url || null,
        source_name: source_name || null,
        reading_time: estimateReadingTime(finalDescriptionFa || description),
        seo_title: (aiResult.seo_title as string) || title.substring(0, 60),
        seo_description: (aiResult.seo_description as string) || finalSummary.substring(0, 160),
        popularity: 0, view_count: 0, save_count: 0, ai_processed: true, ai_translated: true,
      }

      const { data: inserted, error } = await supabase.from("inspirations").insert(contentItem).select("id").single()
      if (error) { results.push({ error: error.message, title }) }
      else { results.push({ id: inserted.id, title: finalTitleFa || title, type: detectContentType(title, description), status: "created", slug: contentItem.slug }) }
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 })
  }
})
