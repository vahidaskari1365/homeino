import { describe, it, expect } from 'vitest';
import { calculateDiscountedPrice, calculateCartTotal, CartItem } from '../lib/calculations';

describe('calculations logic', () => {
  describe('calculateDiscountedPrice', () => {
    it('should calculate 10% discount correctly', () => {
      expect(calculateDiscountedPrice(1000, 10)).toBe(900);
    });

    it('should return same price for 0% discount', () => {
      expect(calculateDiscountedPrice(500, 0)).toBe(500);
    });

    it('should return 0 for 100% discount', () => {
      expect(calculateDiscountedPrice(1000, 100)).toBe(0);
    });

    it('should throw error for invalid discount', () => {
      expect(() => calculateDiscountedPrice(100, -10)).toThrow();
      expect(() => calculateDiscountedPrice(100, 110)).toThrow();
    });
  });

  describe('calculateCartTotal', () => {
    it('should calculate empty cart total as 0', () => {
      expect(calculateCartTotal([])).toBe(0);
    });

    it('should calculate total for multiple items', () => {
      const items: CartItem[] = [
        { price: 100, quantity: 2 },
        { price: 200, quantity: 1 },
        { price: 50, quantity: 4 },
      ];
      expect(calculateCartTotal(items)).toBe(600); // (100*2) + (200*1) + (50*4) = 200 + 200 + 200 = 600
    });
  });
});
