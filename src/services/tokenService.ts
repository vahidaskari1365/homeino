// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TokenTransaction = Tables<"token_transactions">;
export type Wallet = Tables<"wallets">;
export type TokenPackage = Tables<"token_packages">;
export type TokenUsageLog = Tables<"token_usage_logs">;

export const tokenService = {
  async getWallet(userId: string): Promise<Wallet | null> {
    let { data } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
    if (!data) {
      const { data: created } = await supabase.rpc("ensure_wallet", { p_user_id: userId });
      data = created as Wallet | null;
    }
    return data;
  },

  async getTransactions(userId: string, limit = 50): Promise<TokenTransaction[]> {
    const { data } = await supabase
      .from("token_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as TokenTransaction[]) ?? [];
  },

  async getUsageLogs(userId: string, limit = 50): Promise<TokenUsageLog[]> {
    const { data } = await supabase
      .from("token_usage_logs")
      .select("*, designs!left(id, room_id)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as TokenUsageLog[]) ?? [];
  },

  async getPackages(): Promise<TokenPackage[]> {
    const { data } = await supabase
      .from("token_packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data as TokenPackage[]) ?? [];
  },

  async consumeDesignCredit(): Promise<{ success: boolean; source?: "free" | "token"; balance?: number; remaining?: number }> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return { success: false };
    const { data, error } = await supabase.rpc("consume_design_credit", { p_user_id: auth.user.id });
    if (error) return { success: false };
    const r = data as { source: "free" | "token"; free_designs_remaining: number; token_balance: number };
    return { success: true, source: r.source, balance: r.token_balance, remaining: r.free_designs_remaining };
  },

  async getBalance(): Promise<{ tokenBalance: number; freeUsed: number; freeLimit: number }> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return { tokenBalance: 0, freeUsed: 0, freeLimit: 3 };
    const { data } = await supabase
      .from("profiles")
      .select("token_balance, free_designs_used, free_designs_limit")
      .eq("id", auth.user.id)
      .maybeSingle();
    return {
      tokenBalance: data?.token_balance ?? 0,
      freeUsed: data?.free_designs_used ?? 0,
      freeLimit: data?.free_designs_limit ?? 3,
    };
  },
};
