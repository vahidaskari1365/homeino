import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

const CartButton = () => {
  const { totalItems, setOpen } = useCart();
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setOpen(true)}
      className="relative"
      aria-label="سبد خرید"
    >
      <ShoppingBag size={18} />
      {totalItems > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-gold text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Button>
  );
};

export default CartButton;
