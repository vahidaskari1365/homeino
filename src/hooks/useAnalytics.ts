import { useCallback, useEffect, useState } from "react";
import { analyticsService, type ProductAnalytics, type DailyStat, type TopCategory } from "@/services/analyticsService";

export function useAnalytics(storeId?: string | null) {
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const [pa, ds, tc] = await Promise.all([
      analyticsService.getProductAnalytics(storeId),
      analyticsService.getStoreDailyStats(storeId),
      analyticsService.getTopRoomTypes(storeId),
    ]);
    setProductAnalytics(pa);
    setDailyStats(ds);
    setTopCategories(tc);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const totalViews = productAnalytics.reduce((s, p) => s + p.views, 0);
  const totalClicks = productAnalytics.reduce((s, p) => s + p.clicks, 0);
  const avgCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

  return { productAnalytics, dailyStats, topCategories, totalViews, totalClicks, avgCtr, loading, refresh: load };
}
