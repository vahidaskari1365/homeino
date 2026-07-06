import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface AdminDashboardStats {
  total_users: number;
  total_stores: number;
  total_products: number;
  total_orders: number;
  total_designs: number;
  total_revenue: number;
  active_subscriptions: number;
  new_users_today: number;
  new_stores_today: number;
  total_ai_designs: number;
  total_events: number;
}

export type AdminAuditLog = Tables<"admin_audit_logs">;

export const adminService = {
  async getDashboardStats(): Promise<AdminDashboardStats | null> {
    const { data } = await supabase.rpc("get_admin_dashboard_stats");
    return data as AdminDashboardStats | null;
  },

  async getUsers(): Promise<Tables<"profiles">[]> {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    return (data as Tables<"profiles">[]) ?? [];
  },

  async getStores(): Promise<Tables<"stores">[]> {
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    return (data as Tables<"stores">[]) ?? [];
  },

  async getAuditLogs(limit = 50): Promise<AdminAuditLog[]> {
    const { data } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as AdminAuditLog[]) ?? [];
  },

  async logAction(action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>): Promise<void> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return;
    await supabase.from("admin_audit_logs").insert({
      admin_id: auth.user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details ?? {},
    });
  },
};
