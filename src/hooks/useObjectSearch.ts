// @ts-nocheck
import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";
import { toast } from "sonner";

export interface DetectedObject {
  label: string;
  category: string | null;
  style: string | null;
  confidence: number;
  colors: string[];
  materials: string[];
  description: string;
  matches: ProductMatch[];
}

export interface ProductMatch {
  product_id: string;
  product_name: string;
  price: number | null;
  image_url: string | null;
  store_id: string | null;
  store_name: string | null;
  category: string;
  style: string;
  tags: string[];
  confidence: number;
  match_reason: string;
}

export interface ObjectSelection {
  objectLabel: string;
  selectedProducts: ProductMatch[];
  skipped: boolean;
}

export type ObjectStatus = "idle" | "uploading" | "detecting" | "matching" | "done" | "error";

export interface ObjectSearchState {
  status: ObjectStatus;
  imageBase64: string | null;
  imageUrl: string | null;
  objects: DetectedObject[];
  overallStyle: string | null;
  roomType: string | null;
  selections: Record<string, ObjectSelection>;
  error: string | null;
}

const INITIAL: ObjectSearchState = {
  status: "idle",
  imageBase64: null,
  imageUrl: null,
  objects: [],
  overallStyle: null,
  roomType: null,
  selections: {},
  error: null,
};

function createInitialSelection(objects: DetectedObject[]): Record<string, ObjectSelection> {
  const sel: Record<string, ObjectSelection> = {};
  objects.forEach((obj) => {
    const best = obj.matches.length > 0 ? [obj.matches[0]] : [];
    sel[obj.label] = {
      objectLabel: obj.label,
      selectedProducts: best,
      skipped: false,
    };
  });
  return sel;
}

export function useObjectSearch() {
  const [state, setState] = useState<ObjectSearchState>(INITIAL);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  const detectAndMatch = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک تصویر معتبر انتخاب کنید");
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => {
      if (prev.imageUrl) URL.revokeObjectURL(prev.imageUrl);
      return {
        ...prev,
        status: "uploading",
        error: null,
        objects: [],
        selections: {},
        imageUrl: null,
      };
    });

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setState((prev) => ({ ...prev, imageBase64: base64, status: "detecting" }));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

        const { data, error: invokeError } = await supabase.functions.invoke("object-match", {
          body: { image_base64: base64 },
          headers,
        });

        if (invokeError) throw new Error(invokeError.message || "خطا در تشخیص اشیاء");
        if (!data || data.error) throw new Error(data?.error || "خطا در تحلیل تصویر");
        if (!data.objects || data.objects.length === 0) {
          toast.error("هیچ شیء قابل تشخیصی در تصویر یافت نشد");
          setState((prev) => ({ ...prev, status: "error", error: "هیچ شیء تشخیص داده نشد" }));
          return;
        }

        const detected = data.objects as DetectedObject[];
        const selections = createInitialSelection(detected);

        setState((prev) => ({
          ...prev,
          status: "done",
          objects: detected,
          overallStyle: data.overall_style || null,
          roomType: data.room_type || null,
          selections,
          imageUrl: URL.createObjectURL(file),
        }));

        trackEvent("product_suggested", {
          entityType: "reference_image",
          entityId: "object-match",
          metadata: {
            object_count: detected.length,
            total_products: data.total_products,
            overall_style: data.overall_style,
          },
        });

        detected.forEach((obj) => {
          trackEvent("object_detected", {
            metadata: {
              label: obj.label,
              confidence: obj.confidence,
              category: obj.category,
              matches_count: obj.matches.length,
            },
          });
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "خطا در تشخیص اشیاء";
        setState((prev) => ({ ...prev, status: "error", error: message }));
        toast.error(message);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const selectProduct = useCallback((objectLabel: string, product: ProductMatch) => {
    setState((prev) => {
      const current = prev.selections[objectLabel];
      const exists = current?.selectedProducts?.some((p) => p.product_id === product.product_id);
      const newProducts = exists
        ? (current?.selectedProducts || []).filter((p) => p.product_id !== product.product_id)
        : [...(current?.selectedProducts || []), product];
      return {
        ...prev,
        selections: {
          ...prev.selections,
          [objectLabel]: {
            objectLabel,
            selectedProducts: newProducts,
            skipped: false,
          },
        },
      };
    });

    trackEvent("similarity_click", {
      metadata: { object_label: objectLabel, product_id: product.product_id, product_name: product.product_name, action: "select" },
    });
  }, []);

  const skipObject = useCallback((objectLabel: string) => {
    setState((prev) => ({
      ...prev,
      selections: {
        ...prev.selections,
        [objectLabel]: {
          ...prev.selections[objectLabel],
          selectedProducts: [],
          skipped: true,
        },
      },
    }));

    trackEvent("object_skipped", {
      metadata: { object_label: objectLabel },
    });
  }, []);

  const clearObject = useCallback((objectLabel: string) => {
    setState((prev) => ({
      ...prev,
      selections: {
        ...prev.selections,
        [objectLabel]: {
          ...prev.selections[objectLabel],
          selectedProducts: [],
          skipped: false,
        },
      },
    }));

    trackEvent("object_cleared", {
      metadata: { object_label: objectLabel },
    });
  }, []);

  const getSelectedProducts = useCallback((): ProductMatch[] => {
    return Object.values(state.selections)
      .filter((s) => !s.skipped && s.selectedProducts.length > 0)
      .flatMap((s) => s.selectedProducts);
  }, [state.selections]);

  const getSelectedProductIds = useCallback((): string[] => {
    return getSelectedProducts().map((p) => p.product_id);
  }, [getSelectedProducts]);

  const getSelectedCount = useCallback((): number => {
    return getSelectedProducts().length;
  }, [getSelectedProducts]);

  const getTotalPrice = useCallback((): number => {
    return getSelectedProducts().reduce((sum, p) => sum + (p.price || 0), 0);
  }, [getSelectedProducts]);

  const goToDesign = useCallback(() => {
    const ids = getSelectedProductIds();
    if (ids.length === 0) {
      toast.error("حداقل یک محصول انتخاب کنید");
      return;
    }

    const params = new URLSearchParams();
    params.set("products", ids.join(","));
    params.set("from", "inspiration");

    trackEvent("design_started_from_objects", {
      metadata: {
        product_count: ids.length,
        total_price: getTotalPrice(),
        object_count: Object.values(state.selections).filter((s) => !s.skipped).length,
      },
    });

    navigate(`/ai-design?${params.toString()}`);
  }, [getSelectedProductIds, getTotalPrice, state.selections, navigate]);

  const saveInspiration = useCallback(async (title: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("برای ذخیره الهام وارد حساب خود شوید");
        return;
      }

      const selectedProducts = getSelectedProducts();

      const { error } = await supabase.from("design_sessions").insert({
        user_id: session.user.id,
        title: title || "الهام جدید",
        reference_image: state.imageBase64,
        status: "draft",
        metadata: {
          objects: state.objects.map((o) => ({ label: o.label, confidence: o.confidence })),
          selections: Object.entries(state.selections).map(([, s]) => ({
            object_label: s.objectLabel,
            product_ids: s.selectedProducts.map((p) => p.product_id),
            skipped: s.skipped,
          })),
          overall_style: state.overallStyle,
          room_type: state.roomType,
        },
      }).select("id").single();

      if (error) throw error;

      toast.success("الهام با موفقیت ذخیره شد");
    } catch (e) {
      toast.error("خطا در ذخیره الهام");
    }
  }, [state, getSelectedProducts]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => {
      if (prev.imageUrl) URL.revokeObjectURL(prev.imageUrl);
      return INITIAL;
    });
  }, []);

  return {
    ...state,
    detectAndMatch,
    selectProduct,
    skipObject,
    clearObject,
    getSelectedProducts,
    getSelectedProductIds,
    getSelectedCount,
    getTotalPrice,
    goToDesign,
    saveInspiration,
    reset,
  };
}
