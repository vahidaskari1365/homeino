// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SubscriptionPlan = Tables<"subscription_plans">;
export type StoreSubscription = Tables<"store_subscriptions">;

export const subscriptionService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data as SubscriptionPlan[]) ?? [];
  },

  async getStoreSubscription(storeId: string): Promise<{ plan: SubscriptionPlan | null; subscription: StoreSubscription | null }> {
    const { data: sub } = await supabase
      .from("store_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("store_id", storeId)
      .maybeSingle();
    if (!sub) return { plan: null, subscription: null };
    const s = sub as unknown as StoreSubscription & { subscription_plans: SubscriptionPlan };
    return { plan: s.subscription_plans, subscription: s };
  },

  async checkLimit(storeId: string, limitType: "products" | "featured" | "ai_designs" | "advertisements"): Promise<{
    allowed: boolean;
    current?: number;
    limit?: number | null;
    reason?: string;
  }> {
    const { data } = await supabase.rpc("check_plan_limit", { p_store_id: storeId, p_limit_type: limitType });
    return (data as { allowed: boolean; current?: number; limit?: number | null; reason?: string }) ?? { allowed: false };
  },

  formatPrice(price: number): string {
    if (price === 0) return "رایگان";
    return `${price.toLocaleString("fa-IR")} تومان`;
  },
};
