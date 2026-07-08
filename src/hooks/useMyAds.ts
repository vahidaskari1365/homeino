import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// ============================================================
// Homeino — My Ads
// ============================================================
// First ad is free (enforced server-side by the `ads_set_free_flag`
// trigger); every ad after that is flagged `is_free = false` — actual
// token charging for extra ads is a FUTURE rule, not enforced yet.
// ============================================================

export type Ad = Tables<"ads">;
export type AdCategory = Tables<"ad_categories">;
export type AdInput = Pick<
  TablesInsert<"ads">,
  "category_id" | "title" | "description" | "price" | "images" | "city"
>;

export function useAdCategories() {
  const [categories, setCategories] = useState<AdCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // RLS already restricts this to is_active = true for normal users —
      // reserved/inactive service categories never reach the UI.
      const { data, error } = await supabase
        .from("ad_categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");
      if (!error && data) setCategories(data);
      setLoading(false);
    })();
  }, []);

  return { categories, loading };
}

export function useMyAds() {
  const [items, setItems] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: AdInput) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("ads")
        .insert({ ...input, user_id: userId, status: "active" })
        .select()
        .single();

      if (error) {
        toast({ title: "ثبت آگهی با خطا مواجه شد", variant: "destructive" });
        return null;
      }
      toast({ title: data.is_free ? "آگهی رایگان شما ثبت شد 🎉" : "آگهی ثبت شد" });
      trackEvent("advertisement_created", { entityType: "ad", entityId: data.id });
      await load();
      return data;
    },
    [userId, load]
  );

  const update = useCallback(
    async (id: string, input: Partial<AdInput>) => {
      const { error } = await supabase.from("ads").update(input).eq("id", id);
      if (error) {
        toast({ title: "بروزرسانی آگهی با خطا مواجه شد", variant: "destructive" });
        return false;
      }
      toast({ title: "آگهی بروزرسانی شد" });
      trackEvent("advertisement_updated", { entityType: "ad", entityId: id });
      await load();
      return true;
    },
    [load]
  );

  const setStatus = useCallback(
    async (id: string, status: "active" | "paused") => {
      const { error } = await supabase.from("ads").update({ status }).eq("id", id);
      if (error) {
        toast({ title: "بروزرسانی وضعیت آگهی با خطا مواجه شد", variant: "destructive" });
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) {
        toast({ title: "حذف آگهی با خطا مواجه شد", variant: "destructive" });
        return false;
      }
      toast({ title: "آگهی حذف شد" });
      trackEvent("advertisement_deleted", { entityType: "ad", entityId: id });
      await load();
      return true;
    },
    [load]
  );

  return { items, loading, userId, create, update, setStatus, remove, refresh: load };
}
