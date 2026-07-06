// ============================================================
// Homeino — "View in My Room" Button
// ============================================================
// Universal button that appears on EVERY product listing in the
// marketplace. Clicking navigates to the AI Design page with the
// product pre-selected.
// ============================================================

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { trackEvent } from "@/lib/tracking";

interface ViewInMyRoomButtonProps {
  productId: string;
  productName?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** If true, appends to existing products rather than replacing */
  multiSelect?: boolean;
  /** Currently selected product IDs (for multi-select mode) */
  currentSelected?: string[];
  /** Callback when products change (for multi-select mode) */
  onSelectionChange?: (productIds: string[]) => void;
}

export function ViewInMyRoomButton({
  productId,
  productName,
  variant = "outline",
  size = "sm",
  className = "",
  multiSelect = false,
  currentSelected,
  onSelectionChange,
}: ViewInMyRoomButtonProps) {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (multiSelect && onSelectionChange && currentSelected) {
        // Toggle selection
        const isSelected = currentSelected.includes(productId);
        if (isSelected) {
          onSelectionChange(currentSelected.filter((id) => id !== productId));
        } else {
          onSelectionChange([...currentSelected, productId]);
        }
        return;
      }

      // Direct navigation to AI Design with this product
      const params = new URLSearchParams();
      params.set("products", productId);
      if (productName) params.set("product_name", productName);

      trackEvent("product_clicked", {
        entityType: "product",
        entityId: productId,
        metadata: { source: "view_in_my_room", product_name: productName },
      });

      navigate(`/ai-design?${params.toString()}`);
    },
    [navigate, productId, productName, multiSelect, currentSelected, onSelectionChange]
  );

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`gap-1.5 ${className}`}
      title="مشاهده این محصول در طراحی اتاق با هوش مصنوعی"
    >
      <Wand2 size={size === "sm" ? 12 : 14} />
      {multiSelect
        ? currentSelected?.includes(productId)
          ? "حذف از طراحی"
          : "انتخاب برای طراحی"
        : "مشاهده در اتاق"}
    </Button>
  );
}

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
        <Wand2 size={16} />
        طراحی اتاق با {selectedIds.length} محصول انتخاب شده
      </Button>
    </div>
  );
}