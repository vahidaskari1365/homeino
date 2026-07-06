import { useCallback, useEffect, useState } from "react";
import { trustService, type TrustScore } from "@/services/trustService";

export function useTrustScore(storeId?: string | null) {
  const [score, setScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const s = await trustService.getScore(storeId);
    setScore(s);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const recalculate = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const s = await trustService.recalculate(storeId);
    setScore(s);
    setLoading(false);
    return s;
  }, [storeId]);

  return { score, loading, recalculate, refresh: load };
}
