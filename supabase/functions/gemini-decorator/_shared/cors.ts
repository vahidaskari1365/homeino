// ============================================================
// Homeino — CORS Headers Utility
// ============================================================
// Centralizes CORS header generation for all Edge Functions.
// Replaces the insecure "Access-Control-Allow-Origin: *" wildcard
// with origin validation against the production + dev Supabase URLs.
// This prevents cross-origin abuse while keeping legitimate flows working.

/** Allowed origins — Supabase project URLs (production + staging/dev). */
const ALLOWED_ORIGINS: string[] = [
  // Production: derived from SUPABASE_URL env var at runtime
  // Dev: localhost for local development
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

/**
 * Returns CORS headers with the Origin reflected only if it matches
 * an allowed pattern. Falls back to the first allowed origin if the
 * request origin is not recognized (strict deny for unknown origins).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";

  // Dynamically include the Supabase project URL as an allowed origin
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const allowed = [...ALLOWED_ORIGINS];
  if (supabaseUrl && !allowed.includes(supabaseUrl)) {
    allowed.push(supabaseUrl);
  }

  // Also allow any *.supabase.co subdomain (for Supabase-hosted frontends)
  const isAllowed = allowed.some((a) => origin === a) ||
    (/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(origin));

  const allowOrigin = isAllowed ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400", // 24h preflight cache
  };
}

/**
 * Returns a standard OPTIONS preflight response.
 */
export function handleOptions(req: Request): Response {
  return new Response("ok", { headers: getCorsHeaders(req) });
}
