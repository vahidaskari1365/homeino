import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try { return await fetch(url, { ...options, signal: controller.signal }) }
  finally { clearTimeout(timer) }
}

async function triggerFunction(url: string, name: string): Promise<Record<string, unknown>> {
  console.log(`Triggering ${name}...`)
  try {
    const res = await fetchWithTimeout(url, { method: "POST", headers: { "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`, "Content-Type": "application/json" } }, 120_000)
    if (!res.ok) {
      const text = await res.text()
      console.error(`${name} returned ${res.status}:`, text)
      return { name, status: res.status, error: text.substring(0, 500) }
    }
    const data = await res.json()
    console.log(`${name} results:`, data)
    return { name, status: res.status, ...data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`${name} error:`, msg)
    return { name, status: "error", error: msg }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""

  try {
    console.log("Starting scheduled task...")

    const [crawlerResult, processorResult] = await Promise.all([
      triggerFunction(`${SUPABASE_URL}/functions/v1/inspiration-crawler`, "crawler"),
      triggerFunction(`${SUPABASE_URL}/functions/v1/inspiration-ai-processor`, "processor"),
    ])

    return new Response(JSON.stringify({ crawler: crawlerResult, processor: processorResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Cron Error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
