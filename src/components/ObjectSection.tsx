import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Check, X, Star, RotateCcw, Sofa } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice as fmt } from "@/lib/formatPrice";
import { Card, CardContent } from "@/components/ui/card";
import ViewInMyRoomButton from "@/components/ViewInMyRoomButton";
import type { DetectedObject, ProductMatch, ObjectSelection } from "@/hooks/useObjectSearch";

interface ObjectSectionProps {
  object: DetectedObject;
  selection: ObjectSelection;
  onSelect: (product: ProductMatch) => void;
  onSkip: () => void;
  onClear: () => void;
  index: number;
  sortBy?: "similarity" | "price_asc" | "price_desc" | "name";
}

const ObjectSection = ({ object, selection, onSelect, onSkip, onClear, index, sortBy = "similarity" }: ObjectSectionProps) => {
  const [expanded, setExpanded] = useState(true);
  const { selectedProducts, skipped } = selection;

  const sortedMatches = useMemo(() => {
    const matches = [...object.matches];
    switch (sortBy) {
      case "price_asc":
        return matches.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case "price_desc":
        return matches.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case "name":
        return matches.sort((a, b) => a.product_name.localeCompare(b.product_name));
      default:
        return matches.sort((a, b) => b.confidence - a.confidence);
    }
  }, [object.matches, sortBy]);

  return (
    <Card className={`overflow-hidden border transition-all ${skipped ? "opacity-50" : "border-border hover:border-accent/30"}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
            <Sofa size={16} className="text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{object.label}</h3>
              <Badge className="text-[10px] bg-accent/10 text-accent border-0">
                {Math.round(object.confidence * 100)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {object.category && (
                <span className="text-[10px] text-muted-foreground">{object.category}</span>
              )}
              {object.style && (
                <span className="text-[10px] text-muted-foreground">· {object.style}</span>
              )}
              {object.matches.length > 0 && (
                <span className="text-[10px] text-muted-foreground">· {object.matches.length} محصول</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {skipped ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">حذف شده</Badge>
          ) : selectedProducts.length > 0 ? (
            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1">
              <Check size={10} /> {selectedProducts.length} انتخاب
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-200">انتخاب نشده</Badge>
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {/* Object details */}
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {object.colors.map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
            ))}
            {object.materials.map((m) => (
              <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
            ))}
            <span className="text-[10px] text-muted-foreground leading-6 mr-2">{object.description}</span>
          </div>

          {/* Actions */}
          <div className="px-4 pb-3 flex gap-2">
            {!skipped && selectedProducts.length > 0 && (
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onClear}>
                <RotateCcw size={10} /> پاک کردن انتخاب
              </Button>
            )}
            {!skipped && (
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-destructive" onClick={onSkip}>
                <X size={10} /> حذف
              </Button>
            )}
            {skipped && (
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onSkip}>
                <Check size={10} /> برگرداندن
              </Button>
            )}
          </div>

          {/* Selected products list */}
          {!skipped && selectedProducts.length > 0 && (
            <div className="mx-4 mb-3 space-y-2">
              <p className="text-xs text-muted-foreground">محصولات انتخاب شده ({selectedProducts.length}):</p>
              <div className="flex flex-wrap gap-2">
                {selectedProducts.map((sp) => (
                  <div key={sp.product_id} className="flex items-center gap-2 p-2 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                      {sp.image_url && (
                        <img src={sp.image_url} alt={sp.product_name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 max-w-[150px]">
                      <p className="text-xs font-bold line-clamp-1">{sp.product_name}</p>
                      <p className="text-xs text-accent font-bold mt-0.5">{fmt(sp.price)}</p>
                      {sp.store_name && (
                        <p className="text-[10px] text-muted-foreground">{sp.store_name}</p>
                      )}
                    </div>
                    <Badge className="text-xs bg-emerald-500/10 text-emerald-600 shrink-0">
                      <Star size={8} className="ml-0.5" />
                      {Math.round(sp.confidence)}%
                    </Badge>
                    <ViewInMyRoomButton
                      productId={sp.product_id}
                      productName={sp.product_name}
                      productImage={sp.image_url}
                      productPrice={sp.price}
                      variant="compact"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product grid */}
          {!skipped && (
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-2">برای انتخاب کلیک کنید (چندتا مجاز):</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {sortedMatches.map((product) => {
                  const isSelected = selectedProducts.some((p) => p.product_id === product.product_id);
                  return (
                    <div
                      key={product.product_id}
                      className={`relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-accent border-accent bg-accent/5"
                          : "border-border hover:border-accent/40 hover:shadow-sm"
                      }`}
                      onClick={() => onSelect(product)}
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <p className="text-xs font-medium line-clamp-1">{product.product_name}</p>
                        <p className="text-xs text-accent font-bold">{fmt(product.price)}</p>
                        <div className="flex items-center justify-between">
                          <Badge className={`text-[10px] ${
                            product.confidence >= 80 ? "bg-emerald-500/10 text-emerald-600" :
                            product.confidence >= 60 ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                          } border-0`}>
                            {Math.round(product.confidence)}%
                          </Badge>
                          {isSelected && <Check size={10} className="text-accent" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ObjectSection;
