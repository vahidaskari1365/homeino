import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export const useSavedInspirations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collections, isLoading: isLoadingCollections } = useQuery({
    queryKey: ["user_collections"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await db
        .from("user_collections")
        .select(`
          *,
          items:collection_items(inspiration_id)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const saveInspiration = useMutation({
    mutationFn: async ({ inspirationId, collectionId }: { inspirationId: string, collectionId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("لطفاً ابتدا وارد حساب کاربری خود شوید");

      let targetCollectionId = collectionId;

      if (!targetCollectionId) {
        const { data: existing } = await db
          .from("user_collections")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", "علاقه‌مندی‌ها")
          .maybeSingle();

        if (existing) {
          targetCollectionId = (existing as any).id;
        } else {
          const { data: created, error: createError } = await db
            .from("user_collections")
            .insert({ user_id: user.id, name: "علاقه‌مندی‌ها" })
            .select("id")
            .single();

          if (createError) throw createError;
          targetCollectionId = (created as any).id;
        }
      }

      const { error } = await db
        .from("collection_items")
        .insert({ collection_id: targetCollectionId, inspiration_id: inspirationId });

      if (error) {
        if ((error as any).code === "23505") {
          throw new Error("این مورد قبلاً در مجموعه شما ذخیره شده است");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_collections"] });
      toast({
        title: "ذخیره شد",
        description: "ایده مورد نظر به مجموعه شما اضافه شد.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    collections,
    isLoadingCollections,
    saveInspiration,
  };
};
