"use client";

import Link from "next/link";
import { memo, useEffect, useRef } from "react";

interface TickerItem {
  title: string;
  slug: string;
}

interface NewsTickerProps {
  items: TickerItem[];
}

const PIXELS_PER_SECOND = 40;

function NewsTickerImpl({ items }: NewsTickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    let currentAnim: Animation | null = null;
    let cancelled = false;

    // Build / rebuild the animation against the CURRENT track width. Called
    // after fonts settle and again whenever the track resizes (late font
    // swap, viewport change, style injection). Measuring once at mount
    // occasionally caught distance=0 before fonts loaded, leaving the ticker
    // visually frozen.
    const buildAnimation = () => {
      if (cancelled) return;
      const firstCopy = track.firstElementChild as HTMLElement | null;
      if (!firstCopy) return;

      const distance = firstCopy.offsetWidth;
      if (distance === 0) return;

      currentAnim?.cancel();
      const duration = (distance / PIXELS_PER_SECOND) * 1000;
      currentAnim = track.animate(
        [
          { transform: "translate3d(0, 0, 0)" },
          { transform: `translate3d(-${distance}px, 0, 0)` },
        ],
        { duration, iterations: Infinity, easing: "linear" }
      );
      animationRef.current = currentAnim;
    };

    // Wait for fonts so the initial measurement is final.
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(buildAnimation);

    // Rebuild whenever the track width changes.
    const ro = new ResizeObserver(() => buildAnimation());
    ro.observe(track);

    // Browsers suspend WAAPI when the tab is hidden; resume on return.
    // pageshow handles bfcache restoration on Safari/Firefox.
    const resume = () => {
      if (
        document.visibilityState === "visible" &&
        currentAnim &&
        currentAnim.playState !== "running"
      ) {
        currentAnim.play();
      }
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);

    return () => {
      cancelled = true;
      ro.disconnect();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      currentAnim?.cancel();
      animationRef.current = null;
    };
  }, [items]);

  const handleMouseEnter = () => animationRef.current?.pause();
  const handleMouseLeave = () => animationRef.current?.play();

  if (items.length === 0) return null;

  return (
    <aside
      aria-label="Najnowsze artykuły"
      className="border-b border-border bg-foreground overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 items-center whitespace-nowrap"
            aria-hidden={copy === 1 || undefined}
          >
            {items.map((item, i) => (
              <span key={i} className="contents">
                <Link
                  href={`/article/${item.slug}`}
                  className="shrink-0 py-1.5 text-xs text-background/70 hover:text-background transition-colors"
                  tabIndex={copy === 1 ? -1 : undefined}
                >
                  {item.title}
                </Link>
                <span
                  className="shrink-0 text-background/30 text-[8px] mx-2"
                  aria-hidden="true"
                >
                  &bull;
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

// Skip re-render when the ticker items are identical by slug — the root
// layout re-fetches on every navigation, so prop identity is never stable
// even when the data hasn't changed. Without this guard, the inner effect
// would tear down and rebuild the WAAPI animation on every route change.
export const NewsTicker = memo(NewsTickerImpl, (prev, next) => {
  if (prev.items.length !== next.items.length) return false;
  for (let i = 0; i < prev.items.length; i++) {
    if (prev.items[i].slug !== next.items[i].slug) return false;
  }
  return true;
});
