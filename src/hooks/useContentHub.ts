import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContentHubItem, ContentType } from "@/types/content-hub";

export interface ContentHubFilters {
  contentType?: string;
  style?: string;
  roomType?: string;
  search?: string;
  sort?: "newest" | "popular" | "trending";
  budgetMin?: number;
  budgetMax?: number;
  material?: string;
  color?: string;
  isFeatured?: boolean;
  isProjectShowcase?: boolean;
  isCustomerShowcase?: boolean;
  tag?: string;
}

const PAGE_SIZE = 12;

export const useContentHub = (filters: ContentHubFilters) => {
  return useInfiniteQuery({
    queryKey: ["content-hub", filters],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("inspirations")
        .select("*")
        .eq("ai_processed", true);

      if (filters.contentType && filters.contentType !== "all") {
        query = query.eq("content_type", filters.contentType);
      }

      if (filters.style && filters.style !== "all") {
        query = query.eq("style", filters.style);
      }

      if (filters.roomType && filters.roomType !== "all") {
        query = query.eq("room_type", filters.roomType);
      }

      if (filters.material) {
        query = query.contains("materials", [filters.material]);
      }

      if (filters.color) {
        query = query.contains("color_palette", [filters.color]);
      }

      if (filters.isFeatured) {
        query = query.eq("is_featured", true);
      }

      if (filters.isProjectShowcase) {
        query = query.eq("is_project_showcase", true);
      }

      if (filters.isCustomerShowcase) {
        query = query.eq("is_customer_showcase", true);
      }

      if (filters.tag) {
        query = query.contains("tags", [filters.tag]);
      }

      if (filters.budgetMin !== undefined) {
        query = query.gte("budget_range_max", filters.budgetMin);
      }

      if (filters.budgetMax !== undefined) {
        query = query.lte("budget_range_min", filters.budgetMax);
      }

      if (filters.search) {
        const s = filters.search;
        query = query.or(
          `title_fa.ilike.%${s}%,description_fa.ilike.%${s}%,summary.ilike.%${s}%,tags.cs.{${s}}`
        );
      }

      const sortField =
        filters.sort === "popular"
          ? { column: "popularity" as const, ascending: false }
          : filters.sort === "trending"
            ? { column: "view_count" as const, ascending: false }
            : { column: "created_at" as const, ascending: false };

      query = query
        .order(sortField.column, { ascending: sortField.ascending })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data as ContentHubItem[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });
};

export const useContentTypes = () => {
  return useQuery({
    queryKey: ["content-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspirations")
        .select("content_type")
        .eq("ai_processed", true)
        .not("content_type", "is", null);
      if (error) throw error;
      const types = [...new Set(data.map((d) => d.content_type).filter(Boolean))] as string[];
      return types;
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useContentAvailableFilters = () => {
  return useQuery({
    queryKey: ["content-available-filters"],
    queryFn: async () => {
      const fetchDistinct = async (col: string) => {
        const { data, error } = await supabase.rpc("get_distinct_values", {
          column_name: col,
          table_name: "inspirations",
        });
        if (!error && data) return data as string[];
        const { data: fallback } = await supabase
          .from("inspirations")
          .select(col)
          .not(col, "is", null)
          .limit(100);
        if (fallback) {
          const vals = new Set(fallback.map((r) => r[col as keyof typeof r] as string).filter(Boolean));
          return [...vals];
        }
        return [];
      };

      const [styles, rooms, materials] = await Promise.all([
        fetchDistinct("style"),
        fetchDistinct("room_type"),
        fetchDistinct("materials"),
      ]);

      return { styles, rooms, tags: [], materials };
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useContentBySlug = (slug: string) => {
  return useQuery({
    queryKey: ["content", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspirations")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as ContentHubItem;
    },
  });
};

export const useContentById = (id: string) => {
  return useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspirations")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as ContentHubItem;
    },
  });
};

export const useRelatedContent = (contentId: string, style?: string, roomType?: string) => {
  return useQuery({
    queryKey: ["related-content", contentId, style, roomType],
    queryFn: async () => {
      const { data: relations, error: relError } = await supabase
        .from("content_relations")
        .select("target_content_id")
        .eq("source_content_id", contentId);

      if (!relError && relations && relations.length > 0) {
        const relatedIds = relations.map((r) => r.target_content_id);
        const { data } = await supabase
          .from("inspirations")
          .select("*")
          .in("id", relatedIds)
          .limit(6);
        if (data && data.length > 0) return data as ContentHubItem[];
      }

      let query = supabase
        .from("inspirations")
        .select("*")
        .neq("id", contentId)
        .eq("ai_processed", true);

      if (style) query = query.eq("style", style);
      if (roomType) query = query.or(`room_type.eq.${roomType},style.eq.${style}`);

      query = query.order("popularity", { ascending: false }).limit(6);

      const { data } = await query;
      return (data || []) as ContentHubItem[];
    },
    enabled: !!contentId,
  });
};

export const useContentProducts = (contentId: string) => {
  return useQuery({
    queryKey: ["content-products", contentId],
    queryFn: async () => {
      const { data: directProducts, error: dirError } = await supabase
        .from("inspiration_products")
        .select("*, product:products(*)")
        .eq("inspiration_id", contentId);
      if (!dirError && directProducts && directProducts.length > 0) {
        return directProducts;
      }

      const { data: contentProducts, error: cpError } = await supabase
        .from("content_products")
        .select("*, product:products(*)")
        .eq("content_id", contentId)
        .order("sort_order", { ascending: true });

      if (cpError) throw cpError;
      return contentProducts || [];
    },
    enabled: !!contentId,
  });
};

export const useContentSearch = (query: string) => {
  return useInfiniteQuery({
    queryKey: ["content-search", query],
    queryFn: async ({ pageParam = 0 }) => {
      const q = query.trim();
      if (q.length < 2) return [];

      let dbQuery = supabase
        .from("inspirations")
        .select("*")
        .eq("ai_processed", true);

      dbQuery = dbQuery.or(
        `title_fa.ilike.%${q}%,description_fa.ilike.%${q}%,summary.ilike.%${q}%,tags.cs.{${q}}`
      );

      dbQuery = dbQuery
        .order("popularity", { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      const { data, error } = await dbQuery;
      if (error) throw error;
      return data as ContentHubItem[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: query.trim().length >= 2,
  });
};
