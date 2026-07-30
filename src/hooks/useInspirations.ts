import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Inspiration = {
  id: string;
  title?: string;
  title_fa?: string;
  description_fa?: string;
  image_url: string;
  style?: string;
  room_type?: string;
  save_count?: number;
  created_at?: string;
};

const db = supabase as any;

export const useInspirations = (filters: {
  style?: string;
  roomType?: string;
  search?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ["inspirations", filters],
    queryFn: async ({ pageParam = 0 }) => {
      let query = db
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
      return (data || []) as Inspiration[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 12 ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });
};
