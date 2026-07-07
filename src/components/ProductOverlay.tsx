import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useOverlayGeometry } from "@/lib/overlayGeometry";
import { formatPrice as fmt } from "@/lib/formatPrice";
import type { EnrichedPlacement, DBProduct } from "@/lib/aiPipeline";

// --- Strict layer separation ---
// This component is the UI RENDER ENGINE — the last stage of the mandatory
// pipeline: AI → VALIDATION → SANITIZATION → NORMALIZATION → DATABASE
// ENRICHMENT → UI RENDER ENGINE. It receives ONLY `EnrichedPlacement` objects
// that have already passed every prior stage (produced by
// `runAIDesignPipeline` in src/lib/aiPipeline.ts). This component:
// - performs ZERO product lookups of its own (no productsMap, no DB calls)
// - performs ZERO AI-response parsing/validation
// - trusts `pl.product` completely, because the pipeline guarantees it is a
//   real Supabase record and `pl.xNorm/yNorm/scale` are already clamped
// Its only remaining responsibility is converting normalized coordinates
// into pixel-accurate, responsive screen positions.
interface ProductOverlayProps<TProduct extends DBProduct> {
  roomImage: string;
  placements: EnrichedPlacement<TProduct>[];
  onProductClick?: (product: TProduct) => void;
}

function ProductOverlay<TProduct extends DBProduct>({ roomImage, placements, onProductClick }: ProductOverlayProps<TProduct>) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Overlay Geometry / Normalization Layer:
  // AI x/y (normalized 0-1) → pixel offset on the ACTUALLY rendered image, via
  // ResizeObserver + the image's natural dimensions. This guarantees consistent,
  // deterministic placement across mobile/tablet/desktop with no visual drift.
  // `aspectRatio` additionally locks the clipping box to the image's real ratio
  // so the image itself is never cropped (object-cover would otherwise silently
  // shift the visible area on differently-sized screens).
  const { containerRef, onImageLoad, aspectRatio, toPixel } = useOverlayGeometry();

  return (
    <div className="relative w-full rounded-2xl bg-black border border-border select-none" style={{ overflow: "visible" }}>
      {/* Clip only the room image, not the tooltips */}
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden"
        style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
      >
        <img
          src={roomImage}
          alt="اتاق"
          className="w-full h-full object-cover"
          draggable={false}
          onLoad={onImageLoad}
        />
      </div>

      {/* Product overlays at pipeline-normalized coordinates. Every visual
          attribute here (name, price, image) comes from `pl.product`, which
          the pipeline guarantees is a real, DB-backed record. */}
      {placements.map((pl) => {
        if (!pl.product?.image_url) return null;
        const isHovered = hoveredId === pl.product_id;

        // Deterministic pixel mapping; safe fallback to plain percentage
        // positioning if the container/image haven't been measured yet
        // (e.g. first paint before onLoad fires) — never a broken layout.
        const pixel = toPixel(pl.xNorm, pl.yNorm);
        const positionStyle = pixel
          ? { left: `${pixel.left}px`, top: `${pixel.top}px` }
          : { left: `${pl.xNorm * 100}%`, top: `${pl.yNorm * 100}%` };

        return (
          <div
            key={pl.product_id}
            className="absolute cursor-pointer"
            style={{
              ...positionStyle,
              width: "14%",
              zIndex: isHovered ? 30 : 10,
              transform: `translate(-50%, -50%) scale(${pl.scale})`,
              transition: "transform 0.2s ease, left 0.1s ease, top 0.1s ease",
            }}
            onMouseEnter={() => setHoveredId(pl.product_id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onProductClick?.(pl.product)}
          >
            {/* Product image — sourced from DB (pl.product), never the AI */}
            <img
              src={pl.product.image_url}
              alt={pl.product.name}
              className="w-full h-auto object-contain drop-shadow-2xl rounded-lg"
              draggable={false}
            />

            {/* Hover tooltip — name + price, both DB-sourced */}
            {isHovered && (
              <div
                className="absolute z-40 w-52 bg-black/90 backdrop-blur-sm text-white text-xs p-3 rounded-xl shadow-2xl border border-white/10 pointer-events-none"
                style={{
                  bottom: "calc(100% + 10px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="font-bold mb-1 text-sm">{pl.product.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-accent font-bold">{fmt(pl.product.price)}</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-accent/70 text-[10px]">
                  <ShoppingCart size={10} />
                  <span>کلیک برای افزودن به سبد</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom legend bar — positioned relative to the image, not the outer wrapper */}
      {placements.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-6 rounded-b-2xl" style={{ overflow: "visible" }}>
          <div className="flex flex-wrap gap-1">
            {placements.map((pl) => {
              if (!pl.product) return null;
              return (
                <button
                  key={pl.product_id}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                    hoveredId === pl.product_id
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-black/50 text-white/80 border-white/20 hover:bg-white/20"
                  }`}
                  onMouseEnter={() => setHoveredId(pl.product_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onProductClick?.(pl.product)}
                >
                  {pl.product.name.length > 20 ? pl.product.name.slice(0, 20) + "…" : pl.product.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductOverlay;
