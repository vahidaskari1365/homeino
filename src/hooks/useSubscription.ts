// @ts-nocheck

// ============================================================
// Homeino — Phase 3: Subscription Engine (useSubscription)
// ============================================================
// Full SaaS subscription hook for store owners.
// Loads plans, current subscription, and provides limit-checking.
//
// Architecture supports future payment gateway — does NOT
// implement payments.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionService } from "@/services/subscriptionService";
import type { Tables } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/tracking";

// ─── Types ────────────────────────────────────────────────
export type SubscriptionPlan = Tables<"subscription_plans">;

export type StoreSubscription = Tables<"store_subscriptions">;

export interface PlanWithSubscription {
  plan: SubscriptionPlan | null;
  subscription: StoreSubscription | null;
  storeId: string | null;
  loading: boolean;
}

export interface LimitCheck {
  allowed: boolean;
  reason: string;
  code: string;
  max?: number;
  used?: number;
  available?: number;
}

export type LimitType = "ai_design" | "product" | "featured" | "ad" | "storage";

// ─── Helpers ──────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  starter: "شروع",
  business: "بیزینس",
  professional: "حرفه‌ای",
  enterprise: "سازمانی",
};

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 border-slate-200",
  business: "bg-blue-100 text-blue-700 border-blue-200",
  professional: "bg-purple-100 text-purple-700 border-purple-200",
  enterprise: "bg-gold/15 text-gold border-gold/30",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: "دوره آزمایشی", color: "bg-blue-100 text-blue-700 border-blue-200" },
  active: { label: "فعال", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  past_due: { label: "پرداخت معوق", color: "bg-amber-100 text-amber-700 border-amber-200" },
  canceled: { label: "لغو شده", color: "bg-rose-100 text-rose-700 border-rose-200" },
  none: { label: "بدون اشتراک", color: "bg-muted text-muted-foreground" },
};

export function getAnalyticsTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    none: "بدون دسترسی",
    basic: "پایه",
    pro: "حرفه‌ای",
    enterprise: "سازمانی",
  };
  return labels[tier] || tier;
}

export function getPlanLabel(slug: string): string {
  return PLAN_LABELS[slug] || slug;
}

export function getPlanColor(slug: string): string {
  return PLAN_COLORS[slug] || "bg-muted text-muted-foreground";
}

// ─── Hook ─────────────────────────────────────────────────
export function useSubscription() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [storeSubscription, setStoreSubscription] = useState<PlanWithSubscription>({
    plan: null,
    subscription: null,
    storeId: null,
    loading: true,
  });
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    setPlans((data as SubscriptionPlan[]) || []);
  }, []);

  const loadStoreSubscription = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) {
      setStoreSubscription({ plan: null, subscription: null, storeId: null, loading: false });
      return;
    }

    // Get the user's store
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", auth.user.id)
      .maybeSingle();

    if (!store) {
      setStoreSubscription({ plan: null, subscription: null, storeId: null, loading: false });
      return;
    }

    // Get subscription + plan
    const { data: sub } = await supabase
      .from("store_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("store_id", store.id)
      .maybeSingle();

    if (sub) {
      const subscription = sub as StoreSubscription;
      const subWithPlan = sub as unknown as { subscription_plans: SubscriptionPlan | null };
      setStoreSubscription({
        plan: subWithPlan.subscription_plans ?? null,
        subscription,
        storeId: store.id,
        loading: false,
      });
    } else {
      setStoreSubscription({ plan: null, subscription: null, storeId: store.id, loading: false });
    }
  }, []);

  useEffect(() => {
    Promise.all([loadPlans(), loadStoreSubscription()]).finally(() => setLoading(false));
  }, [loadPlans, loadStoreSubscription]);

  /**
   * Check if the store can perform an action against their plan limits.
   */
  const checkLimit = useCallback(
    async (limitType: LimitType, quantity = 1): Promise<LimitCheck> => {
      const storeId = storeSubscription.storeId;
      if (!storeId) {
        return { allowed: false, reason: "فروشگاهی یافت نشد", code: "no_store" };
      }

      const result = await subscriptionService.checkLimit(storeId, limitType as "products" | "featured" | "ai_designs" | "advertisements");

      if (!result.allowed) {
        return { allowed: false, reason: result.reason || "خطا در بررسی محدودیت", code: "error" };
      }

      return {
        allowed: result.allowed,
        reason: result.reason || "",
        code: "ok",
        max: result.limit ?? undefined,
        used: result.current,
        available: result.limit !== null && result.current !== undefined ? result.limit - result.current : undefined,
      };
    },
    [storeSubscription.storeId],
  );

  /**
   * Track subscription view event.
   */
  const trackView = useCallback((planSlug?: string) => {
    trackEvent("subscription_viewed", {
      metadata: { plan_slug: planSlug ?? "all" },
    });
  }, []);

  /**
   * Track premium view event.
   */
  const trackPremiumView = useCallback(() => {
    trackEvent("premium_viewed");
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([loadPlans(), loadStoreSubscription()]).finally(() => setLoading(false));
  }, [loadPlans, loadStoreSubscription]);

  return {
    plans,
    storeSubscription,
    loading,
    checkLimit,
    trackView,
    trackPremiumView,
    refresh,
  };
}

