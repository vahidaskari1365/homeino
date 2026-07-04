// ============================================================
// Homeino — Decorate Page (Main User Flow)
// ============================================================
// Flow:
//   1. User uploads room image
//   2. Fetches available products from Supabase
//   3. Calls gemini-decorator Edge Function
//   4. Renders products as overlay on room image
//   5. Shows AI consultation and pricing
// ============================================================

import React, { useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import ProductOverlay, { PlacedProduct } from "./ProductOverlay";
import { DecorationResult, Product } from "./homeino-client";

// --- Supabase config (from env) ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

type PageStep = "upload" | "loading" | "result" | "error";

const DecoratePage: React.FC = () => {
  const [step, setStep] = useState<PageStep>("upload");
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [budget, setBudget] = useState<number>(50_000_000); // 50M default
  const [result, setResult] = useState<DecorationResult | null>(null);
  const [placedProducts, setPlacedProducts] = useState<PlacedProduct[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<PlacedProduct | null>(null);

  // --- Handle image upload ---
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setRoomFile(file);

      const reader = new FileReader();
      reader.onload = (ev) => {
        setRoomImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // --- Submit for decoration ---
  const handleDecorate = useCallback(async () => {
    if (!roomFile || !roomImage) return;

    setStep("loading");
    setErrorMsg("");

    try {
      // 1. Convert image to base64 (strip data URL prefix)
      const base64Index = roomImage.indexOf(",") + 1;
      const imageBase64 = roomImage.substring(base64Index);

      // 2. Fetch products from Supabase (filtered by budget)
      const productParams = new URLSearchParams({
        select: "id,name,category,style,price,width,height,depth,image_url,ai_ready_url,tags",
        ...(budget ? { price: `lte.${budget}` } : {}),
        limit: "50",
      });

      const productsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/products?${productParams.toString()}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!productsRes.ok) {
        throw new Error("Failed to fetch products from database");
      }

      const products: Product[] = await productsRes.json();

      if (products.length === 0) {
        throw new Error(
          "No products found matching your criteria. Please add products to the marketplace first."
        );
      }

      // 3. Call Gemini decorator
      const jwtToken = (await getSupabaseToken()) || "";
      const decoratorRes = await fetch(
        `${SUPABASE_URL}/functions/v1/gemini-decorator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
          },
          body: JSON.stringify({
            image_base64: imageBase64,
            products,
            budget,
          }),
        }
      );

      if (!decoratorRes.ok) {
        const errBody = await decoratorRes.json().catch(() => ({}));
        throw new Error(
          (errBody as { error?: string }).error ||
            `Server error (${decoratorRes.status})`
        );
      }

      const decoration: DecorationResult = await decoratorRes.json();

      // 4. Merge product data into placements
      const productMap = new Map(products.map((p) => [p.id, p]));
      const placed: PlacedProduct[] = decoration.placements.map((p) => {
        const product = productMap.get(p.product_id);
        return {
          ...p,
          product_name: product?.name || "Unknown Product",
          product_price: product?.price || 0,
          product_image_url: product?.ai_ready_url || product?.image_url,
          product_category: product?.category,
        };
      });

      setResult(decoration);
      setPlacedProducts(placed);
      setStep("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
      setStep("error");
    }
  }, [roomFile, roomImage, budget]);

  // --- Get Supabase auth token (for authenticated requests) ---
  const getSupabaseToken = async (): Promise<string | null> => {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  };

  // --- Handle placement click ---
  const handlePlacementClick = useCallback((placement: PlacedProduct) => {
    setSelectedProduct((prev) =>
      prev?.product_id === placement.product_id &&
      prev?.x === placement.x &&
      prev?.y === placement.y
        ? null
        : placement
    );
  }, []);

  // --- Reset ---
  const handleReset = useCallback(() => {
    setStep("upload");
    setRoomImage(null);
    setRoomFile(null);
    setResult(null);
    setPlacedProducts([]);
    setErrorMsg("");
    setSelectedProduct(null);
  }, []);

  // ============================================================
  // Render
  // ============================================================
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: "#1F2937",
          marginBottom: "8px",
        }}
      >
        🏠 Homeino — طراحی داخلی با هوش مصنوعی
      </h1>
      <p style={{ color: "#6B7280", marginBottom: "24px" }}>
        عکس اتاق خود را آپلود کنید تا محصولات مناسب را به صورت هوشمند پیشنهاد دهیم
      </p>

      {/* Upload Step */}
      {step === "upload" && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            textAlign: "center" as const,
          }}
        >
          <div
            style={{
              border: "2px dashed #D1D5DB",
              borderRadius: "12px",
              padding: "40px",
              marginBottom: "20px",
              backgroundColor: "#F9FAFB",
              cursor: "pointer",
            }}
            onClick={() => document.getElementById("room-image-input")?.click()}
          >
            {roomImage ? (
              <img
                src={roomImage}
                alt="Uploaded room"
                style={{
                  maxHeight: "400px",
                  maxWidth: "100%",
                  borderRadius: "8px",
                }}
              />
            ) : (
              <div>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                  📸
                </div>
                <p style={{ color: "#6B7280", fontSize: "16px" }}>
                  برای آپلود عکس اتاق کلیک کنید
                </p>
                <p style={{ color: "#9CA3AF", fontSize: "13px", marginTop: "8px" }}>
                  JPEG, PNG — حداکثر ۱۰ مگابایت
                </p>
              </div>
            )}
            <input
              id="room-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
          </div>

          {/* Budget Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <label
              htmlFor="budget-input"
              style={{ fontWeight: "600", color: "#374151" }}
            >
              بودجه (تومان):
            </label>
            <input
              id="budget-input"
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{
                padding: "10px 16px",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                fontSize: "16px",
                width: "200px",
                textAlign: "center" as const,
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleDecorate}
            disabled={!roomImage}
            style={{
              backgroundColor: !roomImage ? "#D1D5DB" : "#4F46E5",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "14px 40px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: !roomImage ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            طراحی با هوش مصنوعی ✨
          </button>
        </div>
      )}

      {/* Loading Step */}
      {step === "loading" && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "60px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            textAlign: "center" as const,
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #E5E7EB",
              borderTop: "4px solid #4F46E5",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ color: "#374151", fontSize: "18px", fontWeight: "600" }}>
            هوش مصنوعی در حال تحلیل اتاق شماست...
          </p>
          <p style={{ color: "#9CA3AF", fontSize: "14px", marginTop: "8px" }}>
            این فرآیند چند لحظه طول می‌کشد
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error Step */}
      {step === "error" && (
        <div
          style={{
            backgroundColor: "#FEF2F2",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            textAlign: "center" as const,
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>❌</div>
          <p
            style={{
              color: "#DC2626",
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            خطا در پردازش
          </p>
          <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
            {errorMsg}
          </p>
          <button
            onClick={handleReset}
            style={{
              backgroundColor: "#DC2626",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "12px 32px",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Result Step */}
      {step === "result" && result && (
        <div>
          {/* Room with overlays */}
          <ProductOverlay
            roomImageUrl={roomImage!}
            placements={placedProducts}
            onPlacementClick={handlePlacementClick}
          />

          {/* Selected Product Detail */}
          {selectedProduct && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "20px",
                marginTop: "16px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937" }}
              >
                {selectedProduct.product_name}
              </h3>
              <p style={{ color: "#4F46E5", fontWeight: "600", fontSize: "16px" }}>
                {selectedProduct.product_price.toLocaleString()} تومان
              </p>
              <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "8px" }}>
                {selectedProduct.reason}
              </p>
              <p style={{ color: "#9CA3AF", fontSize: "12px", marginTop: "4px" }}>
                اطمینان: {Math.round(selectedProduct.confidence * 100)}%
              </p>
            </div>
          )}

          {/* AI Consultation */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              marginTop: "20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#1F2937",
                marginBottom: "12px",
              }}
            >
              🎯 مشاوره طراحی
            </h2>
            <p
              style={{
                color: "#374151",
                fontSize: "15px",
                lineHeight: "1.8",
                marginBottom: "16px",
              }}
            >
              {result.consultation}
            </p>

            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap" as const,
              }}
            >
              <div
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: "8px",
                  padding: "10px 16px",
                }}
              >
                <span style={{ color: "#6B7280", fontSize: "12px" }}>سبک</span>
                <p style={{ fontWeight: "600", color: "#1F2937" }}>
                  {result.style}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#EEF2FF",
                  borderRadius: "8px",
                  padding: "10px 16px",
                }}
              >
                <span style={{ color: "#6B7280", fontSize: "12px" }}>
                  قیمت کل
                </span>
                <p
                  style={{
                    fontWeight: "600",
                    color: "#4F46E5",
                  }}
                >
                  {result.total_price.toLocaleString()} تومان
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#ECFDF5",
                  borderRadius: "8px",
                  padding: "10px 16px",
                }}
              >
                <span style={{ color: "#6B7280", fontSize: "12px" }}>
                  تعداد محصولات
                </span>
                <p style={{ fontWeight: "600", color: "#059669" }}>
                  {result.placements.length} عدد
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{
                marginTop: "20px",
                backgroundColor: "#F3F4F6",
                color: "#374151",
                border: "1px solid #D1D5DB",
                borderRadius: "10px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              طراحی مجدد
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecoratePage;