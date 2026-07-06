import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { profileService, type ProfileCompletion } from "@/services/profileService";

export function useProfileCompletion() {
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) { setLoading(false); return; }
    const c = await profileService.getCompletion(auth.user.id);
    setCompletion(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { completion, loading, refresh: load };
}
