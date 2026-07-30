// ============================================================
// Homeino — Format Price Unit Tests
// ============================================================
// Price formatting is critical for the marketplace — incorrect
// formatting is a direct user-facing bug.

import { describe, it, expect } from "vitest";
import { formatPrice, formatNumber } from "@/lib/formatPrice";

describe("formatPrice", () => {
  it("formats a standard price in Persian digits and Tomans", () => {
    const result = formatPrice(12_500_000);
    expect(result).toContain("۱۲٬۵۰۰٬۰۰۰");
    expect(result).toContain("تومان");
  });

  it("handles zero price", () => {
    const result = formatPrice(0);
    expect(result).toContain("۰");
    expect(result).toContain("تومان");
  });

  it("handles null price gracefully", () => {
    const result = formatPrice(null);
    expect(result).toBe("—");
  });

  it("handles undefined price gracefully", () => {
    const result = formatPrice(undefined as unknown as number | null);
    expect(result).toBe("—");
  });

  it("formats very large prices in Persian numerals", () => {
    const result = formatPrice(1_000_000_000);
    expect(result).toContain("۱٬۰۰۰٬۰۰۰٬۰۰۰");
    expect(result).toContain("تومان");
  });

  it("formats small prices", () => {
    const result = formatPrice(50_000);
    expect(result).toContain("۵۰٬۰۰۰");
    expect(result).toContain("تومان");
  });

  it("returns a string for all inputs", () => {
    expect(typeof formatPrice(100)).toBe("string");
    expect(typeof formatPrice(0)).toBe("string");
    expect(typeof formatPrice(null)).toBe("string");
  });
});

describe("formatNumber", () => {
  it("formats standard numbers in Persian numerals", () => {
    expect(formatNumber(12345)).toBe("۱۲٬۳۴۵");
  });

  it("returns ۰ for null/undefined", () => {
    expect(formatNumber(null)).toBe("۰");
    expect(formatNumber(undefined)).toBe("۰");
  });
});
