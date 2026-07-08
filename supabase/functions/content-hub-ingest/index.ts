import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || ""

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 200)
}

function estimateReadingTime(text: string): number {
  const persianWordsPerMinute = 200
  const words = text.split(/\s+/).length
  return Math.max(1, Math.ceil(words / persianWordsPerMinute))
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const body = await req.json()

    // Support single item or array
    const items = Array.isArray(body) ? body : [body]
    const results = []

    for (const item of items) {
      const {
        title = "",
        description = "",
        image_url = "",
        gallery = [],
        source_url = "",
        source_name = "",
        language = "en",
      } = item

      if (!title || !image_url) {
        results.push({ error: "title and image_url required", item })
        continue
      }

      // Check for duplicate
      if (source_url) {
        const { data: existing } = await supabase
          .from("inspirations")
          .select("id")
          .eq("source_url", source_url)
          .maybeSingle()
        if (existing) {
          results.push({ id: existing.id, status: "skipped", reason: "duplicate" })
          continue
        }
      }

      // Download and upload image to Supabase Storage
      let storedImageUrl = image_url
      try {
        const imgRes = await fetch(image_url)
        if (imgRes.ok) {
          const imgBlob = await imgRes.blob()
          const ext = image_url.split(".").pop()?.split("?")[0] || "jpg"
          const fileName = `${crypto.randomUUID()}.${ext}`
          const { data: uploadData } = await supabase.storage
            .from("inspiration-images")
            .upload(fileName, imgBlob, {
              contentType: imgBlob.type || `image/${ext}`,
              upsert: false,
            })
          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from("inspiration-images")
              .getPublicUrl(fileName)
            storedImageUrl = publicUrl
          }
        }
      } catch {
        // Fallback to original URL
      }

      // Process gallery images
      const storedGallery: string[] = []
      for (const imgUrl of gallery.slice(0, 10)) {
        try {
          const imgRes = await fetch(imgUrl)
          if (imgRes.ok) {
            const imgBlob = await imgRes.blob()
            const ext = imgUrl.split(".").pop()?.split("?")[0] || "jpg"
            const fileName = `${crypto.randomUUID()}.${ext}`
            const { data: uploadData } = await supabase.storage
              .from("inspiration-images")
              .upload(fileName, imgBlob, {
                contentType: imgBlob.type || `image/${ext}`,
                upsert: false,
              })
            if (uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from("inspiration-images")
                .getPublicUrl(fileName)
              storedGallery.push(publicUrl)
            }
          }
        } catch {
          storedGallery.push(imgUrl)
        }
      }

      // Call Gemini for Persian rewriting and metadata extraction
      let aiResult: Record<string, unknown> = {}
      if (GEMINI_API_KEY) {
        const prompt = `
        You are a Persian interior design content writer for Homeino (هومینو), the largest Persian interior design platform.
        Rewrite this article in Persian and extract metadata.

        Original title: ${title}
        Original description: ${description}
        Source: ${source_name}

        Return ONLY valid JSON (no markdown, no code fences):
        {
          "title_fa": "Persian title (catchy, SEO-optimized)",
          "summary": "2-3 sentence Persian summary",
          "description_fa": "Full Persian article body (3-5 paragraphs, informative, natural Persian)",
          "style": "one of: modern, classic, minimal, luxury, traditional, industrial, scandinavian, bohemian, contemporary, rustic, art_deco, mid_century, japandi, eclectic",
          "room_type": "one of: living, bedroom, kitchen, bathroom, office, dining, outdoor, hallway, balcony, kids",
          "tags": ["5-8 Persian tags array"],
          "color_palette": ["5 hex color codes"],
          "materials": ["3-5 materials in Persian"],
          "seo_title": "SEO title for Google (max 60 chars, Persian)",
          "seo_description": "Meta description (max 160 chars, Persian)"
        }
        `

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  ...(image_url ? [{ inline_data: { mime_type: "image/jpeg", data: "" } }] : []),
                ],
              }],
            }),
          }
        )

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ""
          const cleanJson = text.replace(/```json|```/gi, "").trim()
          const parsed = JSON.parse(cleanJson)
          aiResult = parsed
        }
      }

      const detectedType = detectContentType(title, description)
      const finalTitleFa = (aiResult.title_fa as string) || ""
      const finalSummary = (aiResult.summary as string) || description.substring(0, 300)
      const finalDescriptionFa = (aiResult.description_fa as string) || ""

      // Build the content item
      const contentItem = {
        title,
        title_fa: finalTitleFa || title,
        description: description.substring(0, 2000),
        description_fa: finalDescriptionFa || finalSummary,
        summary: finalSummary,
        image_url: storedImageUrl,
        gallery: storedGallery.length > 0 ? storedGallery : null,
        content_type: detectedType,
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
        popularity: 0,
        view_count: 0,
        save_count: 0,
        ai_processed: true,
        ai_translated: true,
      }

      const { data: inserted, error } = await supabase
        .from("inspirations")
        .insert(contentItem)
        .select("id")
        .single()

      if (error) {
        results.push({ error: error.message, title })
      } else {
        results.push({
          id: inserted.id,
          title: finalTitleFa || title,
          type: detectedType,
          status: "created",
          slug: contentItem.slug,
        })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
