import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ============================================================
// Homeino — Generic Event Tracking
// ============================================================
// A single, best-effort helper for logging product/AI/ad/notification
// events into `analytics_events` (see the SaaS dashboard migration).
// Fire-and-forget: tracking must NEVER throw or block the UI/AI flow it
// instruments — failures are swallowed and only logged to the console.
//
// Does not participate in the AI validation/sanitization/render pipeline;
// it is purely observability for the Customer/Seller dashboards.
// ============================================================

export type AnalyticsEventType =
  | "user_registered"
  | "profile_completed"
  | "room_uploaded"
  | "ai_started"
  | "ai_finished"
  | "ai_failed"
  | "design_saved"
  | "design_shared"
  | "product_suggested"
  | "product_viewed"
  | "product_clicked"
  | "favorite_added"
  | "ad_created"
  | "ad_edited"
  | "ad_deleted"
  | "token_used"
  | "subscription_viewed"
  | "featured_product_viewed"
  | "notifications_read";

export interface TrackEventOptions {
  entityType?: string;
  entityId?: string;
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

export async function trackEvent(eventType: AnalyticsEventType, options: TrackEventOptions = {}): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      user_id: auth?.user?.id ?? null,
      session_id: getSessionId(),
      event_type: eventType,
      entity_type: options.entityType ?? null,
      entity_id: options.entityId ?? null,
      metadata: (options.metadata ?? {}) as unknown as Json,
    });
  } catch (err) {
    // Tracking must never break the app.
    console.warn("trackEvent failed:", eventType, err);
  }
}
