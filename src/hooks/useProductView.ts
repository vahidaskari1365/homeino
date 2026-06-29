import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Logs a single product view. Deduplicated per browser session
 * (one view per product per session) via sessionStorage to avoid spam.
 */
export function useProductView(product_id: string | null | undefined, profile_id: string | null | undefined) {
  useEffect(() => {
    if (!product_id || !profile_id) return;
    const key = `viewed:${product_id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("product_views").insert({
        product_id,
        profile_id,
        viewer_id: user?.id ?? null,
      });
    })();
  }, [product_id, profile_id]);
}
