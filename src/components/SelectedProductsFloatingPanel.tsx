import { ShoppingCart, X, ShoppingBag, Banknote } from "lucide-react";
import { formatPrice as fmt } from "@/lib/formatPrice";

interface Product {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
}

interface SelectedProductsFloatingPanelProps {
  products: Product[];
  total: number;
  onRemove: (id: string) => void;
  onAddToCart: (product: Product) => void;
  onBuyAll: () => void;
  onClear: () => void;
}

const SelectedProductsFloatingPanel = ({
  products,
  total,
  onRemove,
  onAddToCart,
  onBuyAll,
  onClear,
}: SelectedProductsFloatingPanelProps) => {
  if (products.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-card border border-border/80 shadow-2xl rounded-2xl p-4 backdrop-blur-md bg-background/95">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-accent" />
            <span className="text-sm font-bold">{products.length} محصول انتخاب شده</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-accent">{fmt(total)}</span>
            <button onClick={onClear} className="text-[10px] text-muted-foreground hover:text-foreground">
              پاک کردن
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 bg-muted/50 rounded-xl p-2 shrink-0 min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden shrink-0">
                {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 max-w-[120px]">
                <p className="text-[10px] font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-accent font-bold">{fmt(p.price)}</p>
              </div>
              <button
                onClick={() => onRemove(p.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <button
            onClick={onBuyAll}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
          >
            <ShoppingBag size={14} />
            خرید همه
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectedProductsFloatingPanel;
