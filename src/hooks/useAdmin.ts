import { useCallback, useEffect, useState } from "react";
import { adminService, type AdminDashboardStats, type AdminAuditLog } from "@/services/adminService";
import type { Tables } from "@/integrations/supabase/types";

export function useAdminStats() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await adminService.getDashboardStats();
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, refresh: load };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<Tables<"profiles">[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const u = await adminService.getUsers();
    setUsers(u);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { users, loading, refresh: load };
}

export function useAdminAuditLogs() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const l = await adminService.getAuditLogs();
    setLogs(l);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { logs, loading, refresh: load };
}
