// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TrustScore = Tables<"store_trust_scores">;

export interface TrustBadge {
  slug: string;
  label: string;
  icon: string;
  color: string;
}

const BADGE_META: Record<string, TrustBadge> = {
  verified: { slug: "verified", label: "فروشگاه تأیید شده", icon: "shield-check", color: "text-blue-500" },
  premium: { slug: "premium", label: "فروشگاه ویژه", icon: "crown", color: "text-gold" },
  ai_optimized: { slug: "ai_optimized", label: "بهینه‌سازی هومینو استودیو", icon: "sparkles", color: "text-purple-500" },
  top_rated: { slug: "top_rated", label: "برترین فروشگاه", icon: "star", color: "text-gold" },
  trending: { slug: "trending", label: "فروشگاه محبوب", icon: "trending-up", color: "text-emerald-brand" },
  profile_completed: { slug: "profile_completed", label: "پروفایل کامل", icon: "check-circle", color: "text-emerald-brand" },
};

export const trustService = {
  async getScore(storeId: string): Promise<TrustScore | null> {
    let { data } = await supabase
      .from("store_trust_scores")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    if (!data) {
      const { data: calculated } = await supabase.rpc("calculate_trust_score", { p_store_id: storeId });
      data = calculated as TrustScore | null;
    }
    return data as TrustScore | null;
  },

  async recalculate(storeId: string): Promise<TrustScore | null> {
    const { data, error } = await supabase.rpc("calculate_trust_score", { p_store_id: storeId });
    if (error) {
      console.error("Trust score calculation failed:", error);
      return null;
    }
    return data as TrustScore | null;
  },

  getBadgeMeta(slug: string): TrustBadge {
    return BADGE_META[slug] ?? { slug, label: slug, icon: "award", color: "text-muted-foreground" };
  },

  getScoreLabel(score: number): string {
    if (score >= 80) return "عالی";
    if (score >= 60) return "خوب";
    if (score >= 40) return "متوسط";
    return "نیاز به بهبود";
  },
};
