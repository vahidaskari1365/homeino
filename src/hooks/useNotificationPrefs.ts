// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notificationService, type NotificationPreference } from "@/services/notificationService";

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;
    setUserId(uid);
    if (!uid) { setLoading(false); return; }
    const p = await notificationService.getPreferences(uid);
    setPrefs(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (updates: Partial<Omit<NotificationPreference, "id" | "user_id" | "created_at" | "updated_at">>) => {
    if (!userId) return false;
    const ok = await notificationService.updatePreferences(userId, updates);
    if (ok) setPrefs((prev) => prev ? { ...prev, ...updates } : prev);
    return ok;
  }, [userId]);

  return { prefs, loading, update, refresh: load };
}
