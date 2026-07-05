// ============================================================
// Homeino — Phase 2: Token Ledger (useWallet)
// ============================================================
// Full-featured wallet hook backed by the new wallet/
// wallet_transactions/token_usage_logs tables.
//
// First 3 AI designs are FREE (free_designs_limit).
// After free quota: every AI design consumes exactly 1 token.
//
// Architecture supports future payment gateway via
// credit_wallet() — but does NOT implement payments.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";

// ─── Types ────────────────────────────────────────────────
export interface WalletState {
  loading: boolean;
  userId: string | null;
  walletId: string | null;
  balance: number;
  freeDesignsUsed: number;
  freeDesignsLimit: number;
  freeDesignsRemaining: number;
  hasCredit: boolean;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  credit: number;
  debit: number;
  balance_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface TokenPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tokens: number;
  bonus_tokens: number;
  price_rial: number;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  total_tokens: number;
}

export interface UsageLog {
  id: string;
  user_id: string;
  wallet_id: string;
  usage_type: "free_design" | "token_design";
  tokens_consumed: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

const INITIAL: WalletState = {
  loading: true,
  userId: null,
  walletId: null,
  balance: 0,
  freeDesignsUsed: 0,
  freeDesignsLimit: 3,
  freeDesignsRemaining: 3,
  hasCredit: true,
};

// ─── Hook ─────────────────────────────────────────────────
export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? null;

    if (!userId) {
      setState({ ...INITIAL, loading: false });
      setTransactions([]);
      setUsageLogs([]);
      return;
    }

    // Load wallet + profile data in parallel
    const [walletResult, profileResult] = await Promise.all([
      supabase.from("wallets").select("id, balance").eq("user_id", userId).maybeSingle(),
      supabase
        .from("profiles")
        .select("free_designs_used, free_designs_limit, token_balance")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const wallet = walletResult.data;
    const profile = profileResult.data;

    const balance = wallet?.balance ?? profile?.token_balance ?? 0;
    const freeDesignsUsed = profile?.free_designs_used ?? 0;
    const freeDesignsLimit = profile?.free_designs_limit ?? 3;
    const remaining = Math.max(0, freeDesignsLimit - freeDesignsUsed);

    setState({
      loading: false,
      userId,
      walletId: wallet?.id ?? null,
      balance,
      freeDesignsUsed,
      freeDesignsLimit,
      freeDesignsRemaining: remaining,
      hasCredit: remaining > 0 || balance > 0,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Load the last N wallet transactions.
   */
  const loadTransactions = useCallback(async (limit = 20) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return;

    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    setTransactions((data as WalletTransaction[]) || []);
  }, []);

  /**
   * Load the last N token usage logs.
   */
  const loadUsageLogs = useCallback(async (limit = 20) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return;

    const { data } = await supabase
      .from("token_usage_logs")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    setUsageLogs((data as UsageLog[]) || []);
  }, []);

  /**
   * Load active token packages.
   */
  const loadPackages = useCallback(async (): Promise<TokenPackage[]> => {
    const { data } = await supabase
      .from("token_packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    const packages = (data as TokenPackage[]) || [];
    return packages.map((p) => ({
      ...p,
      total_tokens: p.tokens + p.bonus_tokens,
    }));
  }, []);

  /**
   * Atomically consumes one AI-design credit (free quota first, then a
   * token). Call this BEFORE invoking the gemini-decorator Edge Function.
   * Returns false (and shows a toast) if the user has no credit left.
   */
  const consumeDesignCredit = useCallback(async (): Promise<boolean> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      toast({ title: "ابتدا وارد حساب کاربری شوید", variant: "destructive" });
      return false;
    }

    const { data, error } = await supabase.rpc("consume_design_credit", {
      p_user_id: userId,
    });

    if (error) {
      if (error.message?.includes("insufficient_credit") || error.message?.includes("insufficient_balance")) {
        toast({
          title: "اعتبار طراحی شما تمام شده است",
          description: "برای ادامه، توکن خریداری کنید یا به پلن پرمیوم ارتقا دهید.",
          variant: "destructive",
        });
      } else {
        toast({ title: "خطا در بررسی اعتبار طراحی", variant: "destructive" });
      }
      return false;
    }

    const result = data as {
      source: "free" | "token";
      free_designs_remaining: number;
      token_balance: number;
    } | null;

    if (result) {
      setState((prev) => ({
        ...prev,
        freeDesignsRemaining: result.free_designs_remaining,
        freeDesignsUsed: prev.freeDesignsLimit - result.free_designs_remaining,
        balance: result.token_balance,
        hasCredit: result.free_designs_remaining > 0 || result.token_balance > 0,
      }));

      trackEvent("token_consumed", {
        metadata: {
          source: result.source,
          token_balance_after: result.token_balance,
          free_remaining: result.free_designs_remaining,
        },
      });
    }
    return true;
  }, []);

  return {
    ...state,
    // Backward compatibility aliases
    tokenBalance: state.balance,
    transactions,
    usageLogs,
    refresh: load,
    loadTransactions,
    loadUsageLogs,
    loadPackages,
    consumeDesignCredit,
  };
}

// Re-export the old name for backward compatibility
export { useWallet as useTokens };