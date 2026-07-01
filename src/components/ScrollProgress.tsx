import { useEffect, useState } from "react";

/**
 * Thin gold progress bar pinned to the top of the viewport that fills
 * as the user scrolls through the page. Uses rAF-throttled scroll handling.
 */
const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      const scrollTop = window.scrollY;
      const height =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0;
      setProgress(pct);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
};

export default ScrollProgress;
