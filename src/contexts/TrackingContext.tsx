// ============================================================
// Homeino — TrackingProvider
// ============================================================
// Automatically wires global events (user_login, user_logout)
// and provides the `useTracking` hook for ad-hoc events.
// ============================================================

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, type AnalyticsEventType, type TrackEventOptions } from "@/lib/tracking";

// ─── Context ────────────────────────────────────────────────
interface TrackingContextValue {
  track: (eventType: AnalyticsEventType, options?: TrackEventOptions) => Promise<void>;
}

const TrackingContext = createContext<TrackingContextValue>({
  track: async () => {},
});

// ─── Provider ───────────────────────────────────────────────
export function TrackingProvider({ children }: { children: ReactNode }) {
  const prevUserIdRef = useRef<string | null>(null);

  // Track login/logout by monitoring auth state
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      const prevId = prevUserIdRef.current;

      if (event === "SIGNED_IN" && userId && userId !== prevId) {
        trackEvent("user_login", {
          metadata: {
            email: session.user?.email,
            method: session.user?.app_metadata?.provider ?? "email",
          },
        });
      }

      if (event === "SIGNED_OUT") {
        if (prevId) {
          trackEvent("user_logout", {
            metadata: {
              session_duration_seconds: undefined, // Could track in future
            },
          });
        }
        prevUserIdRef.current = null;
        return;
      }

      prevUserIdRef.current = userId;
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: TrackingContextValue = {
    track: trackEvent,
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────
export function useTracking(): TrackingContextValue {
  return useContext(TrackingContext);
}