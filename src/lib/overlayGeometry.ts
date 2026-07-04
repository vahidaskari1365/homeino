// ============================================================
// Homeino — Overlay Geometry / Normalization Layer
// ============================================================
// Converts AI-provided percentage coordinates (0-100, relative to the FULL
// original image the model analyzed) into pixel-accurate positions on the
// actually-rendered <img>, regardless of device, container size, or image
// aspect ratio.
//
// Flow: AI coordinates (0-100 %) → normalized space (0-1) → pixel offset
//       based on the CURRENT rendered image size (via ResizeObserver).
//
// Safe fallback: until both the container and the image have been measured
// at least once, toPixel() returns null and callers should fall back to
// plain CSS percentage positioning (which remains correct as long as the
// container's aspect-ratio is locked to the image's natural ratio).
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";

export interface RenderedSize {
  width: number;
  height: number;
}

export interface OverlayGeometry {
  /** Attach to the element that wraps/clips the room image */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Attach to the room <img>'s onLoad handler */
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  /** naturalWidth / naturalHeight ratio of the room image, once known */
  aspectRatio: number | null;
  /** true once both the container and the image have been measured */
  ready: boolean;
  /**
   * Normalizes a 0-100 (%) AI coordinate into a pixel offset relative to the
   * rendered container. Returns null (safe fallback → use plain % CSS) if
   * measurements aren't available yet.
   */
  toPixel: (xPercent: number, yPercent: number) => { left: number; top: number } | null;
}

function clamp01(v: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export function useOverlayGeometry(): OverlayGeometry {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<RenderedSize | null>(null);
  const [naturalSize, setNaturalSize] = useState<RenderedSize | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setContainerSize({ width, height });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setNaturalSize({ width: naturalWidth, height: naturalHeight });
    }
  }, []);

  const aspectRatio = naturalSize ? naturalSize.width / naturalSize.height : null;
  const ready = containerSize !== null && naturalSize !== null;

  const toPixel = useCallback(
    (xPercent: number, yPercent: number): { left: number; top: number } | null => {
      if (!containerSize) return null;
      const nx = clamp01(xPercent / 100);
      const ny = clamp01(yPercent / 100);
      return { left: nx * containerSize.width, top: ny * containerSize.height };
    },
    [containerSize]
  );

  return { containerRef: containerRef as React.RefObject<HTMLDivElement>, onImageLoad, aspectRatio, ready, toPixel };
}
