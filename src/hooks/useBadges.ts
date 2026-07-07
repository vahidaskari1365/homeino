import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { badgeService, type BadgeDefinition, type UserBadge, type SellerBadge } from "@/services/badgeService";

export function useUserBadges() {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) { setLoading(false); return; }
    const b = await badgeService.getUserBadges(auth.user.id);
    setBadges(b);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { badges, loading, refresh: load };
}

export function useBadges() {
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await badgeService.getAllBadgeDefinitions();
    setDefinitions(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { definitions, loading, refresh: load };
}

export function useSellerBadges(storeId?: string | null) {
  const [badges, setBadges] = useState<SellerBadge[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const b = await badgeService.getSellerBadges(storeId);
    setBadges(b);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return { badges, loading, refresh: load };
}
