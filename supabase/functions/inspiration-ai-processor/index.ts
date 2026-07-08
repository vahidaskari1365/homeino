import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const AI_TIMEOUT_MS = 25_000

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try { return await fetch(url, { ...options, signal: controller.signal }) }
  finally { clearTimeout(timer) }
}

async function callVisionAI(prompt: string, imageUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get("ZHIPU_API_KEY")
  if (!apiKey) return null

  const models = ["glm-4v", "glm-4v-plus", "glm-4v-flash"]
  for (const model of models) {
    try {
      const res = await fetchWithTimeout(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
      )
      if (res.ok) {
        const data = await res.json()
        const text = data?.choices?.[0]?.message?.content
        if (text) return text
      } else {
        const errText = await res.text()
        console.error(`Zhipu ${model} failed:`, errText)
      }
    } catch (e) {
      console.error(`Zhipu ${model} error:`, e instanceof Error ? e.message : e)
    }
  }

  // Fallback: try text-only model (no image analysis, just metadata extraction)
  try {
    const res = await fetchWithTimeout(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      },
      AI_TIMEOUT_MS
    )
    if (res.ok) {
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      if (text) return text
    }
  } catch (e) {
    console.error("Zhipu text fallback error:", e instanceof Error ? e.message : e)
  }

  return null
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: unprocessed, error: fetchError } = await supabase
      .from("inspirations")
      .select("*")
      .eq("ai_processed", false)
      .limit(5)

    if (fetchError) throw fetchError
    if (!unprocessed || unprocessed.length === 0) {
      return new Response(JSON.stringify({ message: "No items to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const results = []

    for (const item of unprocessed) {
      console.log(`Processing item: ${item.id} - ${item.title}`)

      const prompt = `
Analyze this interior design image and provide the following in Persian (Farsi):
1. title_fa: A catchy Persian title for this design.
2. description_fa: A brief (2-3 sentences) description in Persian.
3. style: One of (modern, classic, minimal, luxury, traditional, industrial, scandinavian, bohemian). MUST be one of these English words.
4. room_type: One of (living, bedroom, kitchen, bathroom, office, dining, outdoor). MUST be one of these English words.
5. tags: 5-8 Persian tags as an array of strings.
6. color_palette: An array of 5 hex color codes.

Return ONLY raw JSON object.
`

      const content = await callVisionAI(prompt, item.image_url)
      if (!content) {
        console.error(`All AI models failed for item ${item.id}, skipping`)
        results.push({ id: item.id, status: "ai_failed" })
        continue
      }

      try {
        const cleanContent = content.replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(cleanContent)

        const updateData: Record<string, unknown> = {
          ai_processed: true,
          ai_translated: true,
        }
        if (parsed.title_fa) updateData.title_fa = parsed.title_fa
        if (parsed.description_fa) updateData.description_fa = parsed.description_fa
        if (parsed.style) updateData.style = parsed.style
        if (parsed.room_type) updateData.room_type = parsed.room_type
        if (parsed.tags) updateData.tags = parsed.tags
        if (parsed.color_palette) updateData.color_palette = parsed.color_palette

        const { error: updateError } = await supabase
          .from("inspirations")
          .update(updateData)
          .eq("id", item.id)

        if (updateError) {
          console.error(`Update Error for ${item.id}:`, updateError)
          results.push({ id: item.id, status: "update_error", error: updateError.message })
        } else {
          results.push({ id: item.id, status: "processed" })
        }
      } catch (parseError) {
        console.error(`Parse Error for ${item.id}:`, parseError instanceof Error ? parseError.message : parseError, content)
        results.push({ id: item.id, status: "parse_error" })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("AI Processor error:", error instanceof Error ? error.message : error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
