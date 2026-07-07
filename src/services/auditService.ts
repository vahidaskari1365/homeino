// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AuditLog = Tables<"audit_logs">;
export type ActorType = "user" | "seller" | "admin" | "system";

export interface AuditLogFilter {
  actor_id?: string;
  actor_type?: ActorType;
  target_type?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export const auditService = {
  async create(
    actor_id: string,
    actor_type: ActorType,
    target_type: string,
    target_id?: string,
    action?: string,
    old_values?: Record<string, unknown>,
    new_values?: Record<string, unknown>
  ): Promise<string | null> {
    const { data } = await supabase.rpc("create_audit_log", {
      p_actor_id: actor_id,
      p_actor_type: actor_type,
      p_target_type: target_type,
      p_target_id: target_id,
      p_action: action,
      p_old_values: old_values ?? {},
      p_new_values: new_values ?? {},
    });
    return data as string | null;
  },

  async search(filters: AuditLogFilter): Promise<{ total: number; logs: AuditLog[] }> {
    const { data } = await supabase.rpc("admin_search_audit_logs", {
      p_actor_id: filters.actor_id ?? null,
      p_actor_type: filters.actor_type ?? null,
      p_target_type: filters.target_type ?? null,
      p_action: filters.action ?? null,
      p_from_date: filters.from_date ?? null,
      p_to_date: filters.to_date ?? null,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
    });
    return (data as { total: number; logs: AuditLog[] }) ?? { total: 0, logs: [] };
  },

  async getRecent(limit = 50): Promise<AuditLog[]> {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as AuditLog[]) ?? [];
  },
};
