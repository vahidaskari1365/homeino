// ============================================================
// Homeino — Product Overlay Component
// Renders product images on top of a room image using
// percentage-based positioning from Gemini placements
// ============================================================

import React, { useState, useCallback, useRef } from "react";

// --- Types ---
export interface PlacementData {
  product_id: string;
  x: number;       // 0-100 (%)
  y: number;       // 0-100 (%)
  scale: number;   // 0.5-1.5
  rotation: number; // -15 to +15
  confidence: number;
  reason: string;
}

export interface PlacedProduct extends PlacementData {
  product_name: string;
  product_price: number;
  product_image_url?: string;
  product_category?: string;
}

interface ProductOverlayProps {
  roomImageUrl: string;
  placements: PlacedProduct[];
  onPlacementClick?: (placement: PlacedProduct) => void;
}

// ============================================================
// Component
// ============================================================

const ProductOverlay: React.FC<ProductOverlayProps> = ({
  roomImageUrl,
  placements,
  onPlacementClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        overflow: "hidden",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}
    >
      {/* Room Image — the base layer */}
      <img
        src={roomImageUrl}
        alt="Room"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          pointerEvents: "none",
        }}
        draggable={false}
      />

      {/* Product Overlays */}
      {placements.map((placement) => (
        <ProductPin
          key={`${placement.product_id}-${placement.x}-${placement.y}`}
          placement={placement}
          onClick={onPlacementClick}
        />
      ))}
    </div>
  );
};

// ============================================================
// Individual Product Pin
// ============================================================

interface ProductPinProps {
  placement: PlacedProduct;
  onClick?: (placement: PlacedProduct) => void;
}

const ProductPin: React.FC<ProductPinProps> = ({ placement, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = useCallback(() => {
    onClick?.(placement);
  }, [placement, onClick]);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute",
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        transform: `translate(-50%, -50%) scale(${placement.scale}) rotate(${placement.rotation}deg)`,
        cursor: "pointer",
        zIndex: hovered ? 100 : 10,
        transition: "transform 0.15s ease, z-index 0s",
      }}
    >
      {/* Product Image */}
      {placement.product_image_url && !imageError && (
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: hovered
              ? "0 8px 25px rgba(0,0,0,0.3)"
              : "0 2px 8px rgba(0,0,0,0.2)",
            border: hovered ? "2px solid #4F46E5" : "2px solid transparent",
            transition: "all 0.2s ease",
            backgroundColor: "white",
          }}
        >
          <img
            src={placement.product_image_url}
            alt={placement.product_name}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "4px",
            }}
            draggable={false}
          />
        </div>
      )}

      {/* Fallback if no image / error */}
      {(!placement.product_image_url || imageError) && (
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: hovered ? "#4F46E5" : "#10B981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            transition: "all 0.2s ease",
          }}
        >
          {placement.product_name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Tooltip on hover */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: "8px",
            backgroundColor: "white",
            borderRadius: "10px",
            padding: "10px 14px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
            minWidth: "180px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 200,
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "14px",
              color: "#1F2937",
              marginBottom: "4px",
            }}
          >
            {placement.product_name}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#4F46E5",
              fontWeight: "600",
            }}
          >
            {placement.product_price.toLocaleString()} تومان
          </div>
          {placement.product_category && (
            <div
              style={{
                fontSize: "11px",
                color: "#9CA3AF",
                marginTop: "2px",
              }}
            >
              {placement.product_category}
            </div>
          )}
          <div
            style={{
              fontSize: "11px",
              color: "#6B7280",
              marginTop: "4px",
              maxWidth: "200px",
              whiteSpace: "normal",
              wordWrap: "break-word",
            }}
          >
            اعتماد: {Math.round(placement.confidence * 100)}%
          </div>
          {/* Arrow */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid white",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ProductOverlay;