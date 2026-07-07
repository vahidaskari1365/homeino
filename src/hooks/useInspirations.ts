// @ts-nocheck
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type Inspiration = Database["public"]["Tables"]["inspirations"]["Row"];

export const useInspirations = (filters: {
  style?: string;
  roomType?: string;
  search?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ["inspirations", filters],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("inspirations")
        .select("*")
        .eq("ai_processed", true)
        .order("created_at", { ascending: false })
        .range(pageParam * 12, (pageParam + 1) * 12 - 1);

      if (filters.style && filters.style !== "همه") {
        query = query.eq("style", filters.style);
      }
      
      if (filters.roomType && filters.roomType !== "همه") {
        query = query.eq("room_type", filters.roomType);
      }

      if (filters.search) {
        query = query.or(`title_fa.ilike.%${filters.search}%,description_fa.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Inspiration[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 12 ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });
};
