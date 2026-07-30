/**
 * Utility functions for business logic calculations
 */

/**
 * Calculates the final price after applying a discount percentage
 * @param price Original price
 * @param discountPercentage Discount percentage (0-100)
 * @returns Final price
 */
export const calculateDiscountedPrice = (price: number, discountPercentage: number): number => {
  if (discountPercentage < 0 || discountPercentage > 100) {
    throw new Error('Discount percentage must be between 0 and 100');
  }
  return price * (1 - discountPercentage / 100);
};

/**
 * Calculates total cart value
 * @param items Array of items with price and quantity
 * @returns Total price
 */
export interface CartItem {
  price: number;
  quantity: number;
}

export const calculateCartTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

/**
 * Formats a number as a Persian price string
 * @param amount Amount to format
 * @returns Formatted string with 'تومان' suffix
 */
export const formatPersianPrice = (amount: number): string => {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
};
