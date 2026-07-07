// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export interface ProductAnalytics {
  product_id: string;
  product_name: string;
  views: number;
  clicks: number;
  favorites: number;
  ai_recommendations: number;
  ctr: number;
  recommendation_rate: number;
  monthly_growth: number;
}

export interface DailyStat {
  date: string;
  views: number;
  clicks: number;
  favorites: number;
  orders_count: number;
  revenue: number;
}

export interface TopCategory {
  category: string;
  count: number;
}

export const analyticsService = {
  async getProductAnalytics(storeId: string): Promise<ProductAnalytics[]> {
    const { data } = await supabase.rpc("get_store_product_analytics", { p_store_id: storeId });
    return ((data as Record<string, unknown>[]) ?? []).map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      views: Number(r.views) || 0,
      clicks: Number(r.clicks) || 0,
      favorites: Number(r.saves ?? r.favorites) || 0,
      ai_recommendations: Number(r.ai_recommendations) || 0,
      ctr: Number(r.ctr) || 0,
      recommendation_rate: Number(r.recommendation_rate) || 0,
      monthly_growth: 0,
    }));
  },

  async getDailyViews(storeId: string, days = 30): Promise<{ day: string; views: number }[]> {
    const { data } = await supabase.rpc("get_store_daily_views", { p_store_id: storeId, p_days: days });
    return ((data as { day: string; views: number }[]) ?? []).map((r) => ({
      day: r.day,
      views: Number(r.views) || 0,
    }));
  },

  async getStoreDailyStats(storeId: string, days = 30): Promise<DailyStat[]> {
    const { data } = await supabase
      .from("store_daily_stats")
      .select("*")
      .eq("store_id", storeId)
      .order("date", { ascending: false })
      .limit(days);
    return (data as DailyStat[]) ?? [];
  },

  async getTopRoomTypes(storeId: string): Promise<TopCategory[]> {
    const { data } = await supabase
      .from("products")
      .select("category")
      .eq("store_id", storeId)
      .eq("is_active", true);
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.forEach((p) => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },

  async getTotalViews(storeId: string): Promise<number> {
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", storeId);
    const productIds = (products ?? []).map((p: { id: string }) => p.id);
    if (productIds.length === 0) return 0;

    const { count } = await supabase
      .from("product_views")
      .select("id", { count: "exact", head: true })
      .in("product_id", productIds);
    return count ?? 0;
  },
};
