import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking";

interface ViewInMyRoomButtonProps {
  productId: string;
  productName?: string;
  productImage?: string | null;
  productPrice?: number | null;
  variant?: "icon" | "full";
  size?: "sm" | "default";
  className?: string;
  multiSelect?: boolean;
  currentSelected?: string[];
  onSelectionChange?: (productIds: string[]) => void;
}

const ViewInMyRoomButton = ({
  productId,
  productName,
  productImage,
  productPrice,
  variant = "icon",
  className,
  multiSelect = false,
  currentSelected,
  onSelectionChange,
}: ViewInMyRoomButtonProps) => {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (multiSelect && onSelectionChange && currentSelected) {
        const isSelected = currentSelected.includes(productId);
        if (isSelected) {
          onSelectionChange(currentSelected.filter((id) => id !== productId));
        } else {
          onSelectionChange([...currentSelected, productId]);
        }
        return;
      }

      const params = new URLSearchParams();
      params.set("products", productId);
      if (productName) params.set("product_name", productName);
      if (productImage) params.set("product_image", productImage);
      if (productPrice != null) params.set("product_price", String(productPrice));

      trackEvent("product_clicked", {
        entityType: "product",
        entityId: productId,
        metadata: { source: "view_in_my_room", product_name: productName },
      });

      navigate(`/ai-design?${params.toString()}`);
    },
    [navigate, productId, productName, productImage, productPrice, multiSelect, currentSelected, onSelectionChange]
  );

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full transition-all",
          "bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20",
          className
        )}
      >
        <Sofa size={12} />
        {multiSelect
          ? currentSelected?.includes(productId)
            ? "حذف"
            : "انتخاب"
          : "مشاهده در اتاق"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={productName ? `نمایش ${productName} در اتاق با هومینو استودیو` : "مشاهده در اتاق"}
      aria-label="مشاهده در اتاق"
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center transition-colors border",
        "bg-background/80 border-border text-muted-foreground hover:text-accent hover:border-accent/50",
        className
      )}
    >
      <Sofa size={16} />
    </button>
  );
};

export default ViewInMyRoomButton;

/**
 * Creates the product selection bar for multi-select mode.
 * Shows on pages where multiple products can be selected for a design.
 */
export function DesignSelectionBar({
  selectedIds,
  onStartDesign,
}: {
  selectedIds: string[];
  onStartDesign: () => void;
}) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Button
        onClick={onStartDesign}
        size="lg"
        className="shadow-xl gap-2 px-6"
      >
        <Sofa size={16} />
        طراحی اتاق با {selectedIds.length} محصول انتخاب شده
      </Button>
    </div>
  );
}
