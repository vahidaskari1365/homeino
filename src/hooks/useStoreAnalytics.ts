// ============================================================
// Homeino — Phase 4: Store Analytics Hook
// ============================================================
// Fetches product-level analytics, store overview metrics,
// AI insights, and trend data. Returns structured data ready
// for recharts visualization.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────
export interface ProductAnalyticsRow {
  product_id: string;
  product_name: string;
  views: number;
  clicks: number;
  saves: number;
  ai_recommendations: number;
  ctr: number;
  recommendation_rate: number;
  favorites: number;
  last_viewed_at: string | null;
}

export interface StoreOverview {
  products_count: number;
  total_views: number;
  total_clicks: number;
  total_saves: number;
  total_ai_recommendations: number;
  ctr: number;
  monthly_growth: number;
  this_month_views: number;
  last_month_views: number;
  popularity_trend: MonthlyTrend[];
}

export interface MonthlyTrend {
  month: string;
  views: number;
  label: string;
}

export interface AIInsight {
  top_styles: { value: string; count: number }[];
  top_colors: { value: string; count: number }[];
  top_budgets: { value: string; count: number }[];
  top_room_types: { value: string; count: number }[];
}

interface UseStoreAnalyticsReturn {
  loading: boolean;
  error: string | null;
  storeId: string | null;
  products: ProductAnalyticsRow[];
  overview: StoreOverview | null;
  insights: AIInsight | null;
  refresh: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────
export function useStoreAnalytics(ownerId: string | undefined): UseStoreAnalyticsReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductAnalyticsRow[]>([]);
  const [overview, setOverview] = useState<StoreOverview | null>(null);
  const [insights, setInsights] = useState<AIInsight | null>(null);

  const fetch = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the store
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", ownerId)
        .maybeSingle();

      if (!store) {
        setLoading(false);
        setStoreId(null);
        return;
      }

      setStoreId(store.id);

      // Fetch all analytics in parallel
      const [productRes, overviewRes, insightsRes] = await Promise.all([
        supabase.rpc("get_store_product_analytics", { p_store_id: store.id }),
        supabase.rpc("get_store_analytics_overview", { p_store_id: store.id }),
        supabase.rpc("get_store_analytics_ai_insights", { p_store_id: store.id }),
      ]);

      if (productRes.error) throw new Error(productRes.error.message);
      if (overviewRes.error) throw new Error(overviewRes.error.message);
      if (insightsRes.error) throw new Error(insightsRes.error.message);

      setProducts((productRes.data as ProductAnalyticsRow[]) || []);
      setOverview((overviewRes.data as unknown as StoreOverview) || null);
      setInsights((insightsRes.data as unknown as AIInsight) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت آمار");
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    loading,
    error,
    storeId,
    products,
    overview,
    insights,
    refresh: fetch,
  };
}