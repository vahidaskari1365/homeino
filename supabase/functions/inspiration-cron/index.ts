import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const getCorsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("Origin") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const allowed = ["http://localhost:5173", "http://localhost:8080", "http://localhost:3000"];
  if (supabaseUrl && !allowed.includes(supabaseUrl)) allowed.push(supabaseUrl);
  const isAllowed = allowed.some((a) => origin === a) || /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
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
  const corsHeaders = getCorsHeaders(req);
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
