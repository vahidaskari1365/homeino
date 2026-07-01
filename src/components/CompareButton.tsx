import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare, CompareItem } from "@/contexts/CompareContext";
import { cn } from "@/lib/utils";

interface Props {
  item: CompareItem;
  variant?: "icon" | "full";
  className?: string;
}

const CompareButton = ({ item, variant = "icon", className }: Props) => {
  const { has, add, remove } = useCompare();
  const active = has(item.id);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (active) remove(item.id);
    else add(item);
  };

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant={active ? "default" : "outline"}
        size="sm"
        onClick={onClick}
        className={className}
      >
        <Scale size={16} />
        {active ? "در مقایسه" : "افزودن به مقایسه"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? "حذف از مقایسه" : "افزودن به مقایسه"}
      className={cn(
        "p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors",
        active ? "text-gold" : "text-muted-foreground",
        className,
      )}
    >
      <Scale size={18} />
    </button>
  );
};

export default CompareButton;
