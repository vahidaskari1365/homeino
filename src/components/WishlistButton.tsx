import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist, type WishlistInput } from "@/hooks/useWishlist";
import { cn } from "@/lib/utils";

type Props = {
  item: WishlistInput;
  variant?: "icon" | "button";
  size?: "sm" | "default";
  className?: string;
};

const WishlistButton = ({ item, variant = "icon", size = "sm", className }: Props) => {
  const { isSaved, toggle, userId } = useWishlist();
  const saved = isSaved(item.item_type, item.item_id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggle(item);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        title={!userId ? "برای ذخیره وارد شوید" : saved ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"}
        aria-label="علاقه‌مندی"
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-colors border",
          saved
            ? "bg-gold/15 border-gold text-gold"
            : "bg-background/80 border-border text-muted-foreground hover:text-gold hover:border-gold/50",
          className
        )}
      >
        <Heart size={16} className={cn(saved && "fill-current")} />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      className={cn("gap-1", className)}
    >
      <Heart size={14} className={cn(saved && "fill-current")} />
      {saved ? "ذخیره شده" : "ذخیره"}
    </Button>
  );
};

export default WishlistButton;
