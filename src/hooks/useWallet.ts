import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tokenService, type TokenTransaction, type Wallet } from "@/services/tokenService";

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;
    setUserId(uid);
    if (!uid) { setLoading(false); return; }
    const [w, t] = await Promise.all([
      tokenService.getWallet(uid),
      tokenService.getTransactions(uid),
    ]);
    setWallet(w);
    setTransactions(t);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => { setLoading(true); return load(); }, [load]);

  return { wallet, transactions, loading, userId, refresh };
}
