import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const FEEDS = [
  { name: "Architectural Digest", url: "https://www.architecturaldigest.com/feed/rss" },
  { name: "Dezeen", url: "https://www.dezeen.com/feed/" },
  { name: "Design Milk", url: "https://design-milk.com/feed/" },
]

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  // Restrict to service-role callers (invoked by the cron function).
  const authHeader = req.headers.get("Authorization")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceKey
  )

  try {
    const results = []

    for (const feed of FEEDS) {
      console.log(`Fetching feed: ${feed.name}`)
      const response = await fetch(feed.url)
      const xml = await response.text()

      // Basic RSS parsing using regex (simplified)
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || []
      console.log(`Found ${items.length} items in ${feed.name}`)

      for (const item of items.slice(0, 10)) { // Process top 10 items per feed
        const title = item.match(/<title>(<!\[CDATA\[)?([\s\S]*?)(\]\]>)?<\/title>/)?.[2] || ""
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || ""
        const description = item.match(/<description>(<!\[CDATA\[)?([\s\S]*?)(\]\]>)?<\/description>/)?.[2] || ""
        
        // Try to find image URL in media:content, enclosure, or content:encoded
        let imageUrl = item.match(/<media:content[^>]*url="([^"]*)"/)?.[1] || 
                       item.match(/<enclosure[^>]*url="([^"]*)"/)?.[1] ||
                       item.match(/<img[^>]*src="([^"]*)"/)?.[1]

        if (!imageUrl) {
            // Check for AD specifically if needed, or other common patterns
            const contentEncoded = item.match(/<content:encoded>(<!\[CDATA\[)?([\s\S]*?)(\]\]>)?<\/content:encoded>/)?.[2] || ""
            imageUrl = contentEncoded.match(/<img[^>]*src="([^"]*)"/)?.[1]
        }

        if (title && link && imageUrl) {
          // Check if exists
          const { data: existing } = await supabase
            .from("inspirations")
            .select("id")
            .eq("source_url", link)
            .maybeSingle()

          if (!existing) {
            const { error: insertError } = await supabase
              .from("inspirations")
              .insert({
                title,
                description: description.replace(/<[^>]*>?/gm, "").substring(0, 500),
                image_url: imageUrl,
                source_url: link,
                source_name: feed.name,
                source_rss_feed: feed.url,
                ai_processed: false
              })

            if (insertError) {
              console.error(`Error inserting ${title}:`, insertError)
            } else {
              results.push({ title, status: "inserted" })
            }
          } else {
            results.push({ title, status: "skipped" })
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: "Crawl completed", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Crawler error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
