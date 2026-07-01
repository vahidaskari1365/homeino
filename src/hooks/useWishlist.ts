import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type WishlistItemType = "product" | "set" | "ai_design";

export type WishlistItem = {
  id: string;
  user_id: string;
  item_type: WishlistItemType;
  item_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type WishlistInput = {
  item_type: WishlistItemType;
  item_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  price?: number | null;
  metadata?: Record<string, unknown>;
};

export const useWishlist = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async (uid: string | null) => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("wishlists")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as unknown as WishlistItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      load(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      load(uid);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const isSaved = useCallback(
    (item_type: WishlistItemType, item_id: string) =>
      items.some((i) => i.item_type === item_type && i.item_id === item_id),
    [items]
  );

  const add = useCallback(
    async (input: WishlistInput) => {
      if (!userId) {
        toast({ title: "وارد شوید", description: "برای ذخیره علاقه‌مندی ابتدا وارد شوید.", variant: "destructive" });
        return false;
      }
      const { data, error } = await supabase
        .from("wishlists")
        .insert({
          user_id: userId,
          item_type: input.item_type,
          item_id: input.item_id,
          title: input.title,
          description: input.description ?? null,
          image_url: input.image_url ?? null,
          price: input.price ?? null,
          metadata: (input.metadata ?? {}) as any,
        })
        .select()
        .single();
      if (error) {
        toast({ title: "خطا", description: error.message, variant: "destructive" });
        return false;
      }
      if (data) setItems((prev) => [data as unknown as WishlistItem, ...prev]);
      toast({ title: "ذخیره شد", description: "به علاقه‌مندی‌ها اضافه شد." });
      return true;
    },
    [userId]
  );

  const remove = useCallback(
    async (item_type: WishlistItemType, item_id: string) => {
      if (!userId) return false;
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", userId)
        .eq("item_type", item_type)
        .eq("item_id", item_id);
      if (error) {
        toast({ title: "خطا", description: error.message, variant: "destructive" });
        return false;
      }
      setItems((prev) => prev.filter((i) => !(i.item_type === item_type && i.item_id === item_id)));
      toast({ title: "حذف شد", description: "از علاقه‌مندی‌ها حذف شد." });
      return true;
    },
    [userId]
  );

  const toggle = useCallback(
    async (input: WishlistInput) => {
      if (isSaved(input.item_type, input.item_id)) {
        return remove(input.item_type, input.item_id);
      }
      return add(input);
    },
    [isSaved, add, remove]
  );

  return { items, loading, userId, isSaved, add, remove, toggle, refresh: () => load(userId) };
};
