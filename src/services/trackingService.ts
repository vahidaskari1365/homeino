import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AnalyticsEventType =
  | "user_registered" | "user_login" | "user_logout"
  | "profile_updated" | "profile_completed"
  | "room_uploaded"
  | "ai_started" | "ai_finished" | "ai_failed"
  | "design_saved" | "design_deleted"
  | "project_created" | "project_updated" | "project_deleted"
  | "product_suggested" | "product_viewed" | "product_clicked"
  | "product_favorited" | "product_unfavorited"
  | "advertisement_created" | "advertisement_updated" | "advertisement_deleted" | "advertisement_viewed"
  | "notification_read"
  | "premium_viewed" | "subscription_viewed"
  | "token_consumed" | "token_added"
  | "address_added" | "address_updated" | "address_deleted"
  | "store_viewed" | "store_followed"
  | "design_shared" | "featured_product_viewed" | "notifications_read";

export interface TrackEventOptions {
  entityType?: string;
  entityId?: string;
  storeId?: string;
  metadata?: Record<string, unknown>;
}

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

function getDeviceInfo(): { device: string; platform: string } {
  const ua = navigator.userAgent;
  const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
  const platform = /windows/i.test(ua) ? "windows" : /mac/i.test(ua) ? "mac" : /linux/i.test(ua) ? "linux" : "other";
  return { device, platform };
}

export async function trackEvent(eventType: AnalyticsEventType, options: TrackEventOptions = {}): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const { device, platform } = getDeviceInfo();
    await supabase.from("analytics_events").insert({
      user_id: auth?.user?.id ?? null,
      session_id: getSessionId(),
      event_type: eventType,
      entity_type: options.entityType ?? null,
      entity_id: options.entityId ?? null,
      store_id: options.storeId ?? null,
      metadata: (options.metadata ?? {}) as unknown as Json,
      device,
      platform,
    });
  } catch (err) {
    console.warn("trackEvent failed:", eventType, err);
  }
}

function calculateProfileCompletion(profile: {
  first_name?: string | null; last_name?: string | null; phone?: string | null;
  avatar_url?: string | null; property_type?: string | null; area_sqm?: number | null;
  room_count?: number | null; preferred_style?: string | null; preferred_budget?: number | null;
}): number {
  const fields = [profile.first_name, profile.last_name, profile.phone, profile.avatar_url, profile.property_type, profile.area_sqm, profile.room_count, profile.preferred_style, profile.preferred_budget];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

export async function trackProfileCompletion(profile: Parameters<typeof calculateProfileCompletion>[0], options?: TrackEventOptions): Promise<void> {
  const pct = calculateProfileCompletion(profile);
  await trackEvent("profile_completed", { ...options, metadata: { ...options?.metadata, completion_percentage: pct } });
}

export async function trackAIDesignResult(status: "finished" | "failed", extra: { placementsCount?: number; errorMessage?: string; style?: string; budget?: number } = {}): Promise<void> {
  await trackEvent(status === "finished" ? "ai_finished" : "ai_failed", {
    metadata: { placements_count: extra.placementsCount ?? 0, error_message: extra.errorMessage ?? null, style: extra.style ?? null, budget: extra.budget ?? null },
  });
}

export { calculateProfileCompletion };
