"use client";

import { useEffect, useState } from "react";
import { useScrollY } from "@/lib/hooks/use-scroll-y";

interface ArticleDims {
  /** Article top offset from document origin (absolute). */
  top: number;
  /** Article height in px. */
  height: number;
  /** Viewport height at measurement time. */
  viewport: number;
}

export function ReadingProgress() {
  const scrollY = useScrollY();
  const [dims, setDims] = useState<ArticleDims | null>(null);

  // Measure the article once after mount, then on resize. We don't remeasure
  // on every scroll tick — the article's document position and height don't
  // change mid-scroll, only scrollY does. Progress itself is derived state
  // (no setState in the scroll path — React 19 set-state-in-effect rule).
  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const measure = () => {
      const rect = article.getBoundingClientRect();
      setDims({
        top: rect.top + window.scrollY,
        height: rect.height,
        viewport: window.innerHeight,
      });
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(article);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const progress = computeProgress(scrollY, dims);
  if (progress <= 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Postęp czytania"
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function computeProgress(scrollY: number, dims: ArticleDims | null): number {
  if (!dims) return 0;
  const total = dims.height - dims.viewport;
  if (total <= 0) return 100;
  const scrolled = scrollY - dims.top;
  return Math.max(0, Math.min(100, (scrolled / total) * 100));
}
