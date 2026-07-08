import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/tracking";

// ============================================================
// Homeino — Address Management
// ============================================================
// Addresses live in their own dedicated `addresses` table (never inside
// `profiles`), so a user can own multiple addresses. Scalable for future
// shipping / on-site service modules (designer visits, installers, etc.).
// ============================================================

export type Address = Tables<"addresses">;
export type AddressInput = Omit<
  TablesInsert<"addresses">,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export function useAddresses() {
  const [items, setItems] = useState<Address[]>([]);
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
      .from("addresses")
      .select("*")
      .eq("user_id", uid)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: AddressInput) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("addresses")
        .insert({ ...input, user_id: userId })
        .select()
        .single();

      if (error) {
        toast({ title: "ثبت آدرس با خطا مواجه شد", variant: "destructive" });
        return null;
      }
      toast({ title: "آدرس با موفقیت ثبت شد" });
      trackEvent("address_added", { entityType: "address", entityId: data?.id });
      await load();
      return data;
    },
    [userId, load]
  );

  const update = useCallback(
    async (id: string, input: Partial<AddressInput>) => {
      const { error } = await supabase.from("addresses").update(input).eq("id", id);
      if (error) {
        toast({ title: "بروزرسانی آدرس با خطا مواجه شد", variant: "destructive" });
        return false;
      }
      toast({ title: "آدرس بروزرسانی شد" });
      trackEvent("address_updated", { entityType: "address", entityId: id });
      await load();
      return true;
    },
    [load]
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) {
        toast({ title: "حذف آدرس با خطا مواجه شد", variant: "destructive" });
        return false;
      }
      toast({ title: "آدرس حذف شد" });
      trackEvent("address_deleted", { entityType: "address", entityId: id });
      await load();
      return true;
    },
    [load]
  );

  const setDefault = useCallback((id: string) => update(id, { is_default: true }), [update]);

  return { items, loading, userId, create, update, remove, setDefault, refresh: load };
}
