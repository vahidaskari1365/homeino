import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

  // Only accept invocations that already carry the service role key
  // (e.g., from the scheduled job or an authorized server).
  const authHeader = req.headers.get("Authorization")
  if (!SUPABASE_SERVICE_ROLE_KEY || authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    console.log("Starting scheduled task...")

    // 1. Trigger Crawler
    console.log("Triggering crawler...")
    const crawlerResponse = await fetch(`${SUPABASE_URL}/functions/v1/inspiration-crawler`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
    })
    const crawlerData = await crawlerResponse.json()
    console.log("Crawler results:", crawlerData)

    // 2. Trigger AI Processor
    console.log("Triggering AI processor...")
    const processorResponse = await fetch(`${SUPABASE_URL}/functions/v1/inspiration-ai-processor`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
    })
    const processorData = await processorResponse.json()
    console.log("Processor results:", processorData)

    return new Response(JSON.stringify({ crawler: crawlerData, processor: processorData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Cron Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
