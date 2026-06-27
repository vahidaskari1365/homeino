import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  const ZHIPU_API_KEY = Deno.env.get("ZHIPU_API_KEY") || "3305e9e19f7f4a3982e5cd12ed73d2a0.g7Ab9mA1XVxiUHTS"

  try {
    // 1. Fetch unprocessed inspirations
    const { data: unprocessed, error: fetchError } = await supabase
      .from("inspirations")
      .select("*")
      .eq("ai_processed", false)
      .limit(5) // Process in small batches

    if (fetchError) throw fetchError
    if (!unprocessed || unprocessed.length === 0) {
      return new Response(JSON.stringify({ message: "No items to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const results = []

    for (const item of unprocessed) {
      console.log(`Processing item: ${item.title}`)

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

      const aiResponse = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ZHIPU_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "glm-4v",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: item.image_url } }
              ],
            },
          ],
        }),
      })

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error(`AI Error for ${item.id}:`, errText)
        continue
      }

      const aiData = await aiResponse.json()
      const content = aiData.choices?.[0]?.message?.content || ""
      
      try {
        const cleanContent = content.replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(cleanContent)

        const { error: updateError } = await supabase
          .from("inspirations")
          .update({
            title_fa: parsed.title_fa,
            description_fa: parsed.description_fa,
            style: parsed.style,
            room_type: parsed.room_type,
            tags: parsed.tags,
            color_palette: parsed.color_palette,
            ai_processed: true,
            ai_translated: true
          })
          .eq("id", item.id)

        if (updateError) {
          console.error(`Update Error for ${item.id}:`, updateError)
        } else {
          results.push({ id: item.id, status: "processed" })
        }
      } catch (parseError) {
        console.error(`Parse Error for ${item.id}:`, parseError, content)
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("AI Processor error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
