// ============================================================
// Homeino — Visual Search Hook
// ============================================================
// Handles inspiration image upload, AI analysis via Gemini,
// similarity search, and design session management.
// ============================================================

import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";
import { toast } from "@/hooks/use-toast";
import { AiAnalysisCache } from "@/services/aiAnalysisCache";

// ─── Types ────────────────────────────────────────────────
export interface DetectedObject {
  furniture: string;
  confidence: number;
}

export interface VisualMatchProduct {
  product_id: string;
  product_name: string;
  price: number;
  image_url: string;
  store_id: string | null;
  store_name: string | null;
  category: string;
  style: string;
  tags: string[];
  confidence: number;
  match_reason: string;
}

export interface AIAnalysisResult {
  objects: DetectedObject[];
  style: string;
  colors: string[];
  materials: string[];
  room_type: string;
  description: string;
}

export interface UploadState {
  status: "idle" | "uploading" | "analyzing" | "searching" | "done" | "error";
  referenceImageId: string | null;
  imageUrl: string | null;
  analysis: AIAnalysisResult | null;
  matches: VisualMatchProduct[];
  error: string | null;
}

const INITIAL: UploadState = {
  status: "idle",
  referenceImageId: null,
  imageUrl: null,
  analysis: null,
  matches: [],
  error: null,
};

const visualCache = new AiAnalysisCache<AIAnalysisResult>("visual_search");

// ─── Hook ─────────────────────────────────────────────────
export function useVisualSearch() {
  const [state, setState] = useState<UploadState>(INITIAL);
  const fileHashRef = useRef<string | null>(null);

  /**
   * Upload an inspiration image to Supabase Storage and create a
   * reference_images record.
   */
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setState((prev) => ({ ...prev, status: "uploading", error: null }));

    try {
      const hash = await AiAnalysisCache.hashFile(file);
      const cached = await visualCache.get(hash);
      if (cached) {
        fileHashRef.current = hash;
        setState((prev) => ({
          ...prev,
          status: "done",
          imageUrl: URL.createObjectURL(file),
          analysis: cached,
        }));
        return null;
      }

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      if (!userId) {
        toast({ title: "ابتدا وارد حساب کاربری شوید", variant: "destructive" });
        setState((prev) => ({ ...prev, status: "idle" }));
        return null;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `inspirations/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("reference_images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("reference_images")
        .getPublicUrl(fileName);

      const imageUrl = urlData?.publicUrl || "";

      const { data: refImage, error: refError } = await (supabase.from("reference_images") as any)
        .insert({
          user_id: userId,
          image_url: imageUrl,
          original_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          source: "upload",
        })
        .select()
        .single();

      if (refError) throw new Error(refError.message);

      setState((prev) => ({
        ...prev,
        referenceImageId: refImage.id,
        imageUrl,
        status: "analyzing",
      }));

      trackEvent("room_uploaded" as any, {
        entityType: "reference_image",
        entityId: refImage.id,
        metadata: { source: "inspiration_search", file_size: file.size },
      });

      return refImage.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطا در آپلود تصویر";
      setState((prev) => ({ ...prev, status: "error", error: message }));
      toast({ title: "خطا", description: message, variant: "destructive" });
      return null;
    }
  }, []);

  /**
   * Analyze the reference image using the Gemini Edge Function.
   */
  const analyzeImage = useCallback(async (refImageId: string) => {
    setState((prev) => ({ ...prev, status: "analyzing" }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Not authenticated");

      const { data: refImage, error: refErr } = await (supabase.from("reference_images") as any)
        .select("image_url")
        .eq("id", refImageId)
        .single();

      if (refErr || !refImage) throw new Error("Reference image not found");

      const { data, error } = await supabase.functions.invoke("gemini-decorator", {
        body: {
          action: "analyze_inspiration",
          image_url: refImage.image_url,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message || "خطا در تحلیل تصویر");

      const analysis: AIAnalysisResult = {
        objects: data?.objects || [],
        style: data?.style || "modern",
        colors: data?.colors || [],
        materials: data?.materials || [],
        room_type: data?.room_type || "",
        description: data?.description || "",
      };

      await (supabase.from("reference_images") as any)
        .update({
          ai_analysis: analysis,
          ai_processed: true,
          ai_processed_at: new Date().toISOString(),
        })
        .eq("id", refImageId);

      if (fileHashRef.current) {
        await visualCache.set(fileHashRef.current, analysis);
      }

      setState((prev) => ({ ...prev, analysis }));

      trackEvent("product_suggested" as any, {
        entityType: "reference_image",
        entityId: refImageId,
        metadata: {
          objects_count: analysis.objects.length,
          detected_style: analysis.style,
          colors_count: analysis.colors.length,
        },
      });

      return analysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطا در تحلیل تصویر";
      setState((prev) => ({ ...prev, status: "error", error: message }));
      toast({ title: "خطا", description: message, variant: "destructive" });
      return null;
    }
  }, []);

  /**
   * Search for visually similar products.
   */
  const searchProducts = useCallback(async (
    refImageId: string,
    analysis: AIAnalysisResult
  ) => {
    setState((prev) => ({ ...prev, status: "searching" }));

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      const { data, error } = await supabase.rpc("search_similar_products", {
        p_reference_image_id: refImageId,
        p_detected_objects: JSON.parse(JSON.stringify(analysis.objects)),
        p_detected_style: analysis.style,
        p_detected_colors: analysis.colors,
        p_detected_materials: analysis.materials,
        p_limit: 20,
      });

      if (error) throw new Error(error.message);

      const matches = (data as VisualMatchProduct[]) || [];

      if (matches.length > 0) {
        const matchInserts = matches.map((m, i) => ({
          reference_image_id: refImageId,
          product_id: m.product_id,
          user_id: userId,
          confidence: m.confidence,
          match_reason: m.match_reason,
          match_type: "ai_semantic" as const,
          rank: i + 1,
        }));

        await (supabase.from("visual_matches") as any).insert(matchInserts);
      }

      setState((prev) => ({ ...prev, matches, status: "done" }));
      return matches;
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطا در جستجوی محصولات";
      setState((prev) => ({ ...prev, status: "error", error: message }));
      toast({ title: "خطا", description: message, variant: "destructive" });
      return [];
    }
  }, []);

  /**
   * One-shot: upload → analyze → search
   */
  const uploadAndSearch = useCallback(async (file: File) => {
    const refId = await uploadImage(file);
    if (refId === null) {
      if (state.analysis) return;
      return;
    }

    const analysis = await analyzeImage(refId);
    if (!analysis) return;

    await searchProducts(refId, analysis);
  }, [uploadImage, analyzeImage, searchProducts, state.analysis]);

  /**
   * Save current inspiration with selected products.
   */
  const saveInspiration = useCallback(async (
    title?: string,
    notes?: string,
    selectedProductIds?: string[]
  ) => {
    if (!state.referenceImageId) {
      toast({ title: "خطا", description: "تصویر مرجعی وجود ندارد", variant: "destructive" });
      return null;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) {
      toast({ title: "ابتدا وارد شوید", variant: "destructive" });
      return null;
    }

    try {
      const { data, error } = await (supabase.from("saved_inspirations") as any)
        .insert({
          user_id: auth.user.id,
          reference_image_id: state.referenceImageId,
          title: title || "الهام جدید",
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      const productsToSave = selectedProductIds || state.matches.map((m) => m.product_id);
      if (productsToSave.length > 0) {
        const productInserts = productsToSave.map((pid, i) => ({
          inspiration_id: data.id,
          product_id: pid,
          sort_order: i,
        }));
        await (supabase.from("saved_inspiration_products") as any).insert(productInserts);
      }

      toast({ title: "ذخیره شد", description: "الهام با موفقیت ذخیره شد" });
      return data;
    } catch (err) {
      toast({
        title: "خطا",
        description: err instanceof Error ? err.message : "خطا در ذخیره",
        variant: "destructive",
      });
      return null;
    }
  }, [state.referenceImageId, state.matches]);

  /**
   * Create a design session and navigate to AI Design page.
   */
  const startDesignSession = useCallback(async (
    productIds: string[],
    source: "inspiration_search" | "product_page" | "wishlist" = "inspiration_search"
  ): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return null;

    try {
      const { data: session, error } = await (supabase.from("design_sessions") as any)
        .insert({
          user_id: auth.user.id,
          source,
          reference_image_id: state.referenceImageId,
          product_ids: productIds,
          status: "started",
        })
        .select()
        .single();

      if (error) throw error;

      trackEvent("ai_started" as any, {
        metadata: { source, product_count: productIds.length, session_id: session.id },
      });

      const params = new URLSearchParams();
      params.set("products", productIds.join(","));
      if (session.id) params.set("session", session.id);
      if (state.referenceImageId) params.set("ref", state.referenceImageId);

      return `/ai-design?${params.toString()}`;
    } catch (err) {
      console.error("Failed to create design session:", err);
      const params = new URLSearchParams();
      params.set("products", productIds.join(","));
      return `/ai-design?${params.toString()}`;
    }
  }, [state.referenceImageId]);

  /**
   * Reset the state for a new search.
   */
  const reset = useCallback(() => {
    setState(INITIAL);
  }, []);

  return {
    ...state,
    uploadImage,
    analyzeImage,
    searchProducts,
    uploadAndSearch,
    saveInspiration,
    startDesignSession,
    reset,
  };
}
