import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

const StarRating = ({ value, onChange, size = 18, readOnly = false, className }: Props) => {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
          className={cn("transition-colors", !readOnly && "cursor-pointer hover:scale-110")}
        >
          <Star
            size={size}
            className={cn(n <= display ? "fill-gold text-gold" : "text-muted-foreground")}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
