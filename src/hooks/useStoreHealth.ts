import { useCallback, useEffect, useState } from "react";
import { healthService, type StoreHealthCheck } from "@/services/healthService";

export function useStoreHealth(storeId?: string | null) {
  const [health, setHealth] = useState<StoreHealthCheck | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const h = await healthService.getLatestCheck(storeId);
    setHealth(h);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const runCheck = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const h = await healthService.runCheck(storeId);
    setHealth(h);
    setLoading(false);
    return h;
  }, [storeId]);

  return { health, loading, runCheck, refresh: load };
}
