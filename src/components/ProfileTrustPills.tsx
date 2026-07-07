// @ts-nocheck
import { useEffect, useState } from "react";
import { StoreTrustPills } from "./StoreTrustPills";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  profileId: string;
  size?: "sm" | "xs";
}

export function ProfileTrustPills({ profileId, size = "sm" }: Props) {
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("stores")
      .select("id")
      .eq("owner_id", profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setStoreId(data.id);
      });
    return () => { cancelled = true; };
  }, [profileId]);

  if (!storeId) return null;
  return <StoreTrustPills storeId={storeId} size={size} />;
}
