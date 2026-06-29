import { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

type RevealVariant = "up" | "down" | "left" | "right" | "scale" | "fade";

interface RevealProps {
  children: ReactNode;
  /** animation direction/style */
  variant?: RevealVariant;
  /** stagger delay in ms */
  delay?: number;
  /** transition duration in ms */
  duration?: number;
  className?: string;
  /** reveal only once (default) or repeat on every scroll-in */
  once?: boolean;
  threshold?: number;
}

/**
 * Wraps content with a scroll-triggered "cinematic" reveal animation.
 * The actual easing/transform lives in index.css (.reveal / .reveal-*).
 */
const Reveal = ({
  children,
  variant = "up",
  delay = 0,
  duration = 800,
  className,
  once = true,
  threshold = 0.15,
}: RevealProps) => {
  const { ref, inView } = useScrollReveal<HTMLDivElement>({ once, threshold });

  return (
    <div
      ref={ref}
      className={cn("reveal", `reveal-${variant}`, inView && "reveal-visible", className)}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default Reveal;
