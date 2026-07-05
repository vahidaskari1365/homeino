import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";

// ============================================================
// Homeino — AI Design Token System
// ============================================================
// Reusable, DB-backed credit ledger for AI designs:
//   - First `free_designs_limit` AI designs are FREE (free_designs_used).
//   - Every design after that consumes 1 token (token_balance).
// All mutations happen through the `consume_design_credit` / `credit_tokens`
// SECURITY DEFINER Postgres functions (supabase/migrations/*_saas_dashboard_upgrade.sql)
// — this hook never writes token_balance directly, keeping the ledger safe
// against race conditions and client tampering.
//
// This is architecture-only for payments: `credit_tokens` exists so a future
// payment gateway webhook can top up a user's balance. No payment UI here.
// ============================================================

export interface TokenState {
  loading: boolean;
  userId: string | null;
  tokenBalance: number;
  freeDesignsUsed: number;
  freeDesignsLimit: number;
  freeDesignsRemaining: number;
  hasCredit: boolean;
}

const INITIAL: TokenState = {
  loading: true,
  userId: null,
  tokenBalance: 0,
  freeDesignsUsed: 0,
  freeDesignsLimit: 3,
  freeDesignsRemaining: 3,
  hasCredit: true,
};

export function useTokens() {
  const [state, setState] = useState<TokenState>(INITIAL);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? null;

    if (!userId) {
      setState({ ...INITIAL, loading: false });
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("token_balance, free_designs_used, free_designs_limit")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      setState({ ...INITIAL, loading: false, userId });
      return;
    }

    const remaining = Math.max(0, (data.free_designs_limit ?? 3) - (data.free_designs_used ?? 0));
    setState({
      loading: false,
      userId,
      tokenBalance: data.token_balance ?? 0,
      freeDesignsUsed: data.free_designs_used ?? 0,
      freeDesignsLimit: data.free_designs_limit ?? 3,
      freeDesignsRemaining: remaining,
      hasCredit: remaining > 0 || (data.token_balance ?? 0) > 0,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Atomically consumes one AI-design credit (free quota first, then a
   * token). Call this BEFORE invoking the gemini-decorator Edge Function —
   * it never touches the AI pipeline itself, only the billing gate in front
   * of it. Returns false (and shows a toast) if the user has no credit left.
   */
  const consumeDesignCredit = useCallback(async (): Promise<boolean> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      toast({ title: "ابتدا وارد حساب کاربری شوید", variant: "destructive" });
      return false;
    }

    const { data, error } = await supabase.rpc("consume_design_credit", { p_user_id: userId });

    if (error) {
      if (error.message?.includes("insufficient_credit")) {
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

    const result = data as { source: "free" | "token"; free_designs_remaining: number; token_balance: number } | null;
    if (result) {
      setState((prev) => ({
        ...prev,
        freeDesignsRemaining: result.free_designs_remaining,
        freeDesignsUsed: prev.freeDesignsLimit - result.free_designs_remaining,
        tokenBalance: result.token_balance,
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

  return { ...state, refresh: load, consumeDesignCredit };
}
