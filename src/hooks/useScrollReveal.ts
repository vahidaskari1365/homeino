import { useEffect, useRef, useState } from "react";

interface ScrollRevealOptions {
  /** 0..1 portion of the element that must be visible to trigger */
  threshold?: number;
  /** IntersectionObserver rootMargin */
  rootMargin?: string;
  /** reveal only once (default) or every time it enters/leaves */
  once?: boolean;
}

/**
 * Lightweight scroll-reveal hook built on IntersectionObserver.
 * Respects prefers-reduced-motion and gracefully degrades when IO is missing.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
