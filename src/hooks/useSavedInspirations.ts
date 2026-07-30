import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSavedInspirations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collections, isLoading: isLoadingCollections } = useQuery({
    queryKey: ["user_collections"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_collections")
        .select(`
          *,
          items:collection_items(inspiration_id)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const saveInspiration = useMutation({
    mutationFn: async ({ inspirationId, collectionId }: { inspirationId: string, collectionId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("لطفاً ابتدا وارد حساب کاربری خود شوید");

      let targetCollectionId = collectionId;

      if (!targetCollectionId) {
        // Find or create default collection
        const { data: existing } = await supabase
          .from("user_collections")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", "علاقه‌مندی‌ها")
          .maybeSingle();

        if (existing) {
          targetCollectionId = existing.id;
        } else {
          const { data: created, error: createError } = await supabase
            .from("user_collections")
            .insert({ user_id: user.id, name: "علاقه‌مندی‌ها" })
            .select("id")
            .single();
          
          if (createError) throw createError;
          targetCollectionId = created.id;
        }
      }

      const { error } = await supabase
        .from("collection_items")
        .insert({ collection_id: targetCollectionId, inspiration_id: inspirationId });

      if (error) {
        if (error.code === "23505") { // Unique violation
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

  const unsaveInspiration = useMutation({
    mutationFn: async (inspirationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find collection item
      const { data: item } = await supabase
        .from("collection_items")
        .select("id")
        .eq("inspiration_id", inspirationId)
        .eq("collection_id", collections?.find(c => c.user_id === user.id)?.id || ""); // Simplified

      if (item) {
        // This needs a more robust way to handle multiple collections
      }
    },
  });

  return {
    collections,
    isLoadingCollections,
    saveInspiration,
  };
};
