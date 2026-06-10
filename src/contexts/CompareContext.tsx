import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

export type CompareItem = {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  rating: number;
  attributes: Record<string, unknown>;
  shop_name?: string;
  shop_id?: string;
};

type CompareCtx = {
  items: CompareItem[];
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CompareCtx | null>(null);
const STORAGE_KEY = "homeino_compare";
const MAX_ITEMS = 4;

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = (item: CompareItem) => {
    setItems((prev) => {
      if (prev.find((p) => p.id === item.id)) return prev;
      if (prev.length >= MAX_ITEMS) {
        toast.error(`حداکثر ${MAX_ITEMS} محصول قابل مقایسه است`);
        return prev;
      }
      toast.success("به مقایسه اضافه شد");
      return [...prev, item];
    });
  };

  const remove = (id: string) => setItems((p) => p.filter((x) => x.id !== id));
  const clear = () => setItems([]);
  const has = (id: string) => items.some((x) => x.id === id);

  return (
    <Ctx.Provider value={{ items, add, remove, clear, has, isOpen, setOpen }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
};
