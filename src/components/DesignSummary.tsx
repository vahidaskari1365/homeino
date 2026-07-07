import { ShoppingBag, Wand2, X, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ObjectSelection } from "@/hooks/useObjectSearch";

interface DesignSummaryProps {
  selections: Record<string, ObjectSelection>;
  totalPrice: number;
  selectedCount: number;
  onStartDesign: () => void;
  onClose: () => void;
  open: boolean;
}

const DesignSummary = ({ selections, totalPrice, selectedCount, onStartDesign, onClose, open }: DesignSummaryProps) => {
  if (!open) return null;

  const selectedEntries = Object.entries(selections).filter(
    ([_, s]) => !s.skipped && s.selectedProducts.length > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag size={20} className="text-accent" />
            مجموعه نهایی
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Selected products per object */}
        {selectedEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            هیچ محصولی انتخاب نشده است
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {selectedEntries.map(([label, sel]) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({sel.selectedProducts.length} محصول)
                  </span>
                </div>
                <div className="space-y-2">
                  {sel.selectedProducts.map((product) => (
                    <div key={product.product_id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold line-clamp-1">{product.product_name}</p>
                        <p className="text-xs text-accent font-bold mt-0.5">{product.price ? fmt(product.price) + " تومان" : "—"}</p>
                        {product.store_name && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Store size={10} /> {product.store_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between py-3 border-t border-border mb-6">
            <span className="text-sm text-muted-foreground">{selectedCount} محصول</span>
            <span className="text-lg font-black text-accent">{fmt(totalPrice)} تومان</span>
          </div>
        )}

        {/* Design button */}
        <Button
          onClick={onStartDesign}
          disabled={selectedCount === 0}
          className="w-full h-12 gap-2 text-base font-bold"
        >
          <Wand2 size={18} />
          طراحی اتاق با {selectedCount} محصول
        </Button>

        <p className="text-[10px] text-muted-foreground text-center mt-3">
          پس از کلیک، به صفحه طراحی هوشمند هدایت می‌شوید
        </p>
      </div>
    </div>
  );
};

export default DesignSummary;
