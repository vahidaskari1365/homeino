import { describe, it, expect } from 'vitest';
import { calculateDiscountedPrice, calculateCartTotal, formatPersianPrice } from './calculations';

describe('Business Logic Calculations', () => {
  describe('calculateDiscountedPrice', () => {
    it('should correctly calculate discounted price', () => {
      expect(calculateDiscountedPrice(1000, 20)).toBe(800);
      expect(calculateDiscountedPrice(5000, 50)).toBe(2500);
      expect(calculateDiscountedPrice(100, 0)).toBe(100);
    });

    it('should throw error for invalid percentage', () => {
      expect(() => calculateDiscountedPrice(100, -10)).toThrow();
      expect(() => calculateDiscountedPrice(100, 110)).toThrow();
    });
  });

  describe('calculateCartTotal', () => {
    it('should correctly sum item prices and quantities', () => {
      const items = [
        { price: 1000, quantity: 2 },
        { price: 500, quantity: 3 },
      ];
      expect(calculateCartTotal(items)).toBe(3500);
    });

    it('should return 0 for empty cart', () => {
      expect(calculateCartTotal([])).toBe(0);
    });
  });

  describe('formatPersianPrice', () => {
    it('should format price correctly with comma separator and suffix', () => {
      const formatted = formatPersianPrice(1000);
      expect(formatted).toContain('تومان');
      expect(formatted).toContain(',');
    });
  });
});
