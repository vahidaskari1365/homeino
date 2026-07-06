import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionService, type SubscriptionPlan, type StoreSubscription } from "@/services/subscriptionService";

export function useSubscription(storeId?: string | null) {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const result = await subscriptionService.getStoreSubscription(storeId);
    setPlan(result.plan);
    setSubscription(result.subscription);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return { plan, subscription, loading, refresh: load };
}
