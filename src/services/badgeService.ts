// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type BadgeDefinition = Tables<"badge_definitions">;
export type UserBadge = Tables<"user_badges"> & { badge_definitions?: BadgeDefinition };
export type SellerBadge = Tables<"seller_badges"> & { badge_definitions?: BadgeDefinition };

export const badgeService = {
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const { data } = await supabase
      .from("user_badges")
      .select("*, badge_definitions(*)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false });
    return (data as UserBadge[]) ?? [];
  },

  async getSellerBadges(storeId: string): Promise<SellerBadge[]> {
    const { data } = await supabase
      .from("seller_badges")
      .select("*, badge_definitions(*)")
      .eq("store_id", storeId)
      .order("awarded_at", { ascending: false });
    return (data as SellerBadge[]) ?? [];
  },

  async getAllBadgeDefinitions(): Promise<BadgeDefinition[]> {
    const { data } = await supabase
      .from("badge_definitions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data as BadgeDefinition[]) ?? [];
  },

  async checkAndAwardUserBadges(userId: string): Promise<void> {
    await supabase.rpc("check_and_award_user_badges", { p_user_id: userId });
  },

  getBadgeIcon(slug: string): string {
    const icons: Record<string, string> = {
      first_design: "pen-tool",
      ten_designs: "layers",
      fifty_designs: "award",
      first_favorite: "heart",
      first_advertisement: "megaphone",
      profile_completed: "check-circle",
      verified: "shield-check",
      premium: "crown",
      ai_optimized: "sparkles",
      top_rated: "star",
      trending: "trending-up",
    };
    return icons[slug] ?? "badge-check";
  },
};
