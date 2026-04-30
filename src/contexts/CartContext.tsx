import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export interface CartItem {
  product_id: string;
  profile_id: string;       // seller profile — cart is single-seller by design
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  stock: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => { ok: boolean; message?: string };
  removeItem: (product_id: string) => void;
  updateQuantity: (product_id: string, qty: number) => void;
  clear: () => void;
  totalItems: number;
  totalAmount: number;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "khanezibaa_cart_v1";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch { return []; }
  });
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    let result: { ok: boolean; message?: string } = { ok: true };
    setItems((prev) => {
      // enforce single-seller cart
      if (prev.length && prev[0].profile_id !== item.profile_id) {
        result = { ok: false, message: "سبد خرید فقط می‌تواند از یک فروشگاه باشد. ابتدا سبد را خالی کنید." };
        return prev;
      }
      const existing = prev.find((p) => p.product_id === item.product_id);
      if (existing) {
        const newQty = Math.min(existing.quantity + qty, item.stock || 99);
        return prev.map((p) => p.product_id === item.product_id ? { ...p, quantity: newQty } : p);
      }
      return [...prev, { ...item, quantity: Math.min(qty, item.stock || 99) }];
    });
    return result;
  }, []);

  const removeItem = useCallback((product_id: string) => {
    setItems((prev) => prev.filter((p) => p.product_id !== product_id));
  }, []);

  const updateQuantity = useCallback((product_id: string, qty: number) => {
    setItems((prev) => prev.map((p) => p.product_id === product_id
      ? { ...p, quantity: Math.max(1, Math.min(qty, p.stock || 99)) } : p));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.quantity * (i.price || 0), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clear, totalItems, totalAmount, isOpen, setOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
