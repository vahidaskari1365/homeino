// ============================================================
// Homeino — Format Price Unit Tests
// ============================================================
// Price formatting is critical for the marketplace — incorrect
// formatting is a direct user-facing bug.

import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/formatPrice";

describe("formatPrice", () => {
  it("formats a standard price in Tomans", () => {
    const result = formatPrice(12_500_000);
    // formatPrice uses Intl.NumberFormat("en-US") + " تومان"
    expect(result).toContain("12,500,000");
    expect(result).toContain("تومان");
  });

  it("handles zero price", () => {
    const result = formatPrice(0);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("handles null price gracefully", () => {
    const result = formatPrice(null);
    expect(result).toBeDefined();
  });

  it("handles undefined price gracefully", () => {
    const result = formatPrice(undefined as unknown as number | null);
    expect(result).toBeDefined();
  });

  it("formats very large prices", () => {
    const result = formatPrice(1_000_000_000);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("formats small prices", () => {
    const result = formatPrice(50_000);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("returns a string for all inputs", () => {
    expect(typeof formatPrice(100)).toBe("string");
    expect(typeof formatPrice(0)).toBe("string");
    expect(typeof formatPrice(null)).toBe("string");
  });
});
