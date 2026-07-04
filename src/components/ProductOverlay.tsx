import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useOverlayGeometry } from "@/lib/overlayGeometry";

interface Placement {
  product_id: string;
  x: number;        // 0-100 (%)
  y: number;        // 0-100 (%)
  scale: number;    // 0.5-1.5
  rotation: number; // -15 to +15
  confidence: number; // 0-1
  reason: string;   // Persian explanation
}

interface Product {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  profile_id?: string;
  stock?: number;
}

interface ProductOverlayProps {
  roomImage: string;
  placements: Placement[];
  productsMap: Record<string, Product>;
  onProductClick?: (product: Product) => void;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

const ProductOverlay = ({ roomImage, placements, productsMap, onProductClick }: ProductOverlayProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Overlay Geometry / Normalization Layer:
  // AI x/y (0-100 %) → normalized (0-1) → pixel offset on the ACTUALLY rendered
  // image, via ResizeObserver + the image's natural dimensions. This guarantees
  // consistent placement across mobile/tablet/desktop regardless of container
  // width. `aspectRatio` additionally locks the clipping box to the image's real
  // ratio so the image itself is never cropped (object-cover would otherwise
  // silently shift the visible area on differently-sized screens).
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

      {/* Product overlays at Gemini-determined coordinates */}
      {placements.map((pl) => {
        const product = productsMap[pl.product_id];
        if (!product?.image_url) return null;
        const isHovered = hoveredId === pl.product_id;

        // Normalize AI coordinates to actual rendered pixels; safe fallback to
        // plain percentage positioning if the container/image haven't been
        // measured yet (e.g. first paint before layout/onLoad fire).
        const pixel = toPixel(pl.x, pl.y);
        const positionStyle = pixel
          ? { left: `${pixel.left}px`, top: `${pixel.top}px` }
          : { left: `${pl.x}%`, top: `${pl.y}%` };

        return (
          <div
            key={pl.product_id}
            className="absolute cursor-pointer"
            style={{
              ...positionStyle,
              width: "14%",
              zIndex: isHovered ? 30 : 10,
              transform: `translate(-50%, -50%) scale(${pl.scale}) rotate(${pl.rotation}deg)`,
              transition: "transform 0.2s ease, left 0.1s ease, top 0.1s ease",
            }}
            onMouseEnter={() => setHoveredId(pl.product_id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onProductClick?.(product)}
          >
            {/* Product image */}
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-auto object-contain drop-shadow-2xl rounded-lg"
              style={{ opacity: Math.max(0.75, pl.confidence) }}
              draggable={false}
            />

            {/* Confidence badge */}
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[9px] flex items-center justify-center font-bold shadow-lg border-2 border-background">
              {Math.round(pl.confidence * 100)}
            </div>

            {/* Hover tooltip */}
            {isHovered && (
              <div
                className="absolute z-40 w-52 bg-black/90 backdrop-blur-sm text-white text-xs p-3 rounded-xl shadow-2xl border border-white/10 pointer-events-none"
                style={{
                  bottom: "calc(100% + 10px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="font-bold mb-1 text-sm">{product.name}</div>
                <div className="text-white/70 leading-relaxed mb-2">{pl.reason}</div>
                <div className="flex items-center justify-between">
                  <span className="text-accent font-bold">{fmt(product.price)}</span>
                  <span className="text-white/50 text-[10px]">اطمینان: {Math.round(pl.confidence * 100)}%</span>
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
              const product = productsMap[pl.product_id];
              if (!product) return null;
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
                  onClick={() => onProductClick?.(product)}
                >
                  {product.name.length > 20 ? product.name.slice(0, 20) + "…" : product.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductOverlay;
