// ============================================================
// Homeino — Phase 1: Tracking Engine
// ============================================================
// A complete, production Event Tracking System for every important
// user action. Fire-and-forget: tracking must NEVER throw or block
// the UI — failures are swallowed and only logged to the console.
//
// Every event contains:
//   event_id, user_id, store_id (nullable), session_id, ip (optional),
//   device, platform, timestamp, metadata (jsonb)
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ─── Event Type ──────────────────────────────────────────────
// Every important action in the Homeino platform.
export type AnalyticsEventType =
  // Auth / Profile
  | "user_registered"
  | "user_login"
  | "user_logout"
  | "profile_updated"
  | "profile_completed"
  // Rooms / Uploads
  | "room_uploaded"
  // AI Design Pipeline
  | "ai_started"
  | "ai_finished"
  | "ai_failed"
  | "design_saved"
  | "design_deleted"
  // Projects
  | "project_created"
  | "project_updated"
  | "project_deleted"
  // Products
  | "product_suggested"
  | "product_viewed"
  | "product_clicked"
  | "product_favorited"
  | "product_unfavorited"
  // Advertisements
  | "ad_created"
  | "ad_updated"
  | "ad_deleted"
  | "ad_viewed"
  // Notifications
  | "notification_read"
  // Premium / Subscription
  | "premium_viewed"
  | "subscription_viewed"
  // Token Economy
  | "token_consumed"
  | "token_added"
  // Addresses
  | "address_added"
  | "address_updated"
  | "address_deleted"
  // Store
  | "store_viewed"
  | "store_followed";

// ─── Options ────────────────────────────────────────────────
export interface TrackEventOptions {
  /** Optional entity type (e.g. "product", "room", "design") */
  entityType?: string;
  /** Optional entity UUID */
  entityId?: string;
  /** Optional store UUID for store-scoped events */
  storeId?: string;
  /** Arbitrary JSON payload for additional context */
  metadata?: Record<string, unknown>;
}

// ─── Session ID (persisted to sessionStorage) ──────────────
let cachedSessionId: string | null = null;

function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  try {
    const key = "homeino_session_id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    cachedSessionId = id;
    return id;
  } catch {
    cachedSessionId = crypto.randomUUID();
    return cachedSessionId;
  }
}

// ─── Device / Platform Detection ──────────────────────────
function detectDevice(): string {
  if (typeof navigator === "undefined") return "bot";
  const ua = navigator.userAgent || "";
  if (/bot|crawler|spider|crawling/i.test(ua)) return "bot";
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) return "tablet";
    return "mobile";
  }
  return "desktop";
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "api";
  const ua = navigator.userAgent || "";
  if (/bot|crawler/i.test(ua)) return "api";
  if (/wv|webview/i.test(ua)) return "webview";
  return "web";
}

// ─── Client IP (best-effort via a free service — fire-and-forget) ──
let cachedIp: string | null = null;

async function getClientIp(): Promise<string | null> {
  if (cachedIp) return cachedIp;
  // Only attempt IP detection once per session
  try {
    const resp = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    cachedIp = data.ip ?? null;
    return cachedIp;
  } catch {
    return null;
  }
}

// ─── Profile Completion % ──────────────────────────────────
function calculateProfileCompletion(profile: {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  property_type?: string | null;
  area_sqm?: number | null;
  room_count?: number | null;
  preferred_style?: string | null;
  preferred_budget?: number | null;
}): number {
  const fields: (string | number | null | undefined)[] = [
    profile.first_name,
    profile.last_name,
    profile.phone,
    profile.avatar_url,
    profile.property_type,
    profile.area_sqm,
    profile.room_count,
    profile.preferred_style,
    profile.preferred_budget,
  ];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

// ─── trackEvent — Main Entry Point ─────────────────────────
export async function trackEvent(
  eventType: AnalyticsEventType,
  options: TrackEventOptions = {},
): Promise<void> {
  try {
    const [authResult, ip] = await Promise.all([
      supabase.auth.getUser(),
      getClientIp(),
    ]);

    const userId = authResult?.data?.user?.id ?? null;

    await supabase.from("analytics_events").insert({
      user_id: userId,
      session_id: getSessionId(),
      event_type: eventType,
      store_id: options.storeId ?? null,
      entity_type: options.entityType ?? null,
      entity_id: options.entityId ?? null,
      ip: ip,
      device: detectDevice(),
      platform: detectPlatform(),
      metadata: (options.metadata ?? {}) as Json,
    });
  } catch (err) {
    // Tracking must never break the app.
    console.warn("trackEvent failed:", eventType, err);
  }
}

// ─── Convenience: Track profile completion ─────────────────
export async function trackProfileCompletion(
  profile: Parameters<typeof calculateProfileCompletion>[0],
  options?: TrackEventOptions,
): Promise<void> {
  const pct = calculateProfileCompletion(profile);
  await trackEvent("profile_completed", {
    ...options,
    metadata: {
      ...options?.metadata,
      completion_percentage: pct,
      first_name_filled: !!profile.first_name,
      phone_filled: !!profile.phone,
      avatar_filled: !!profile.avatar_url,
      property_type_filled: !!profile.property_type,
    },
  });
}

// ─── Convenience: Track AI design result ───────────────────
export async function trackAIDesignResult(
  status: "finished" | "failed",
  extra: {
    placementsCount?: number;
    errorMessage?: string;
    style?: string;
    budget?: number;
  } = {},
): Promise<void> {
  const eventType = status === "finished" ? "ai_finished" : "ai_failed";
  await trackEvent(eventType, {
    metadata: {
      placements_count: extra.placementsCount ?? 0,
      error_message: extra.errorMessage ?? null,
      style: extra.style ?? null,
      budget: extra.budget ?? null,
    },
  });
}

// Re-export for convenience
export { calculateProfileCompletion };