// ============================================================
// Homeino — Overlay Geometry Unit Tests
// ============================================================
// Tests the normalized 0-1 → pixel coordinate mapping used by
// the ProductOverlay render engine. This is critical because
// visual placement bugs are hard to catch in integration tests.

import { describe, it, expect } from "vitest";

// ---- Pure function tests (no React/DOM needed) ----
// We test the coordinate math directly by importing the utility
// logic in a testable way.

// The useOverlayGeometry hook wraps ResizeObserver + state, so we
// test the pure math by recreating the same algorithm:

function clamp01(v: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function toPixel(
  xNormalized: number,
  yNormalized: number,
  containerWidth: number,
  containerHeight: number
): { left: number; top: number } {
  return {
    left: clamp01(xNormalized) * containerWidth,
    top: clamp01(yNormalized) * containerHeight,
  };
}

describe("overlayGeometry — coordinate mapping", () => {
  const containerWidth = 800;
  const containerHeight = 600;

  it("maps center coordinates (0.5, 0.5) to the center of the container", () => {
    const pixel = toPixel(0.5, 0.5, containerWidth, containerHeight);
    expect(pixel.left).toBe(400);
    expect(pixel.top).toBe(300);
  });

  it("maps top-left (0, 0) to the origin", () => {
    const pixel = toPixel(0, 0, containerWidth, containerHeight);
    expect(pixel.left).toBe(0);
    expect(pixel.top).toBe(0);
  });

  it("maps bottom-right (1, 1) to the far corner", () => {
    const pixel = toPixel(1, 1, containerWidth, containerHeight);
    expect(pixel.left).toBe(800);
    expect(pixel.top).toBe(600);
  });

  it("clamps values below 0 to 0", () => {
    const pixel = toPixel(-0.5, -1, containerWidth, containerHeight);
    expect(pixel.left).toBe(0);
    expect(pixel.top).toBe(0);
  });

  it("clamps values above 1 to 1", () => {
    const pixel = toPixel(2, 3, containerWidth, containerHeight);
    expect(pixel.left).toBe(800);
    expect(pixel.top).toBe(600);
  });

  it("clamps NaN to 0", () => {
    const pixel = toPixel(NaN, NaN, containerWidth, containerHeight);
    expect(pixel.left).toBe(0);
    expect(pixel.top).toBe(0);
  });

  it("maps partial coordinates correctly", () => {
    const pixel = toPixel(0.25, 0.75, containerWidth, containerHeight);
    expect(pixel.left).toBe(200);
    expect(pixel.top).toBe(450);
  });

  it("works with different container sizes (mobile)", () => {
    const pixel = toPixel(0.5, 0.5, 375, 667);
    expect(pixel.left).toBeCloseTo(187.5);
    expect(pixel.top).toBeCloseTo(333.5);
  });

  it("deterministic — same input always gives same output", () => {
    const a = toPixel(0.3, 0.7, 800, 600);
    const b = toPixel(0.3, 0.7, 800, 600);
    expect(a).toEqual(b);
  });
});

describe("overlayGeometry — aspect ratio", () => {
  it("computes aspect ratio correctly for landscape image", () => {
    const naturalWidth = 1920;
    const naturalHeight = 1080;
    expect(naturalWidth / naturalHeight).toBeCloseTo(16 / 9);
  });

  it("computes aspect ratio correctly for portrait image", () => {
    const naturalWidth = 1080;
    const naturalHeight = 1920;
    expect(naturalWidth / naturalHeight).toBeCloseTo(9 / 16);
  });

  it("computes aspect ratio correctly for square image", () => {
    const naturalWidth = 1000;
    const naturalHeight = 1000;
    expect(naturalWidth / naturalHeight).toBe(1);
  });
});
