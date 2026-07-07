// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StoreHealthCheck = Tables<"store_health_checks">;

export interface HealthSuggestion {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  action: string;
}

export const healthService = {
  async getLatestCheck(storeId: string): Promise<StoreHealthCheck | null> {
    const { data } = await supabase
      .from("store_health_checks")
      .select("*")
      .eq("store_id", storeId)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as StoreHealthCheck | null;
  },

  async runCheck(storeId: string): Promise<StoreHealthCheck | null> {
    const { data, error } = await supabase.rpc("run_store_health_check", { p_store_id: storeId });
    if (error) {
      console.error("Health check failed:", error);
      return null;
    }
    return data as StoreHealthCheck | null;
  },

  getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical": return "text-destructive bg-destructive/10 border-destructive/30";
      case "high": return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      case "medium": return "text-gold bg-gold/10 border-gold/30";
      case "low": return "text-muted-foreground bg-muted/30 border-border";
      default: return "text-muted-foreground bg-muted/30 border-border";
    }
  },

  getScoreColor(score: number): string {
    if (score >= 80) return "text-emerald-brand";
    if (score >= 60) return "text-gold";
    if (score >= 40) return "text-orange-500";
    return "text-destructive";
  },
};
