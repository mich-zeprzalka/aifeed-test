"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface TickerItem {
  title: string;
  slug: string;
}

interface NewsTickerProps {
  items: TickerItem[];
}

const PIXELS_PER_SECOND = 40;

// Snapshot items on first render and never react to prop updates after that.
// Why: the root layout re-fetches on every navigation, so `items` gets a fresh
// reference on each route change. Updating the animation against that risks
// cancelling the WAAPI track and leaving it frozen if the rebuild catches the
// DOM mid-reconciliation (offsetWidth = 0). Trading off in-session freshness
// for a guaranteed always-scrolling marquee.
export function NewsTicker({ items }: NewsTickerProps) {
  const [snapshot] = useState<TickerItem[]>(items);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || snapshot.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;

    const buildAnimation = () => {
      if (cancelled) return;
      const firstCopy = track.firstElementChild as HTMLElement | null;
      if (!firstCopy) return;
      const distance = firstCopy.offsetWidth;
      if (distance === 0) return;

      animationRef.current?.cancel();
      const duration = (distance / PIXELS_PER_SECOND) * 1000;
      animationRef.current = track.animate(
        [
          { transform: "translate3d(0, 0, 0)" },
          { transform: `translate3d(-${distance}px, 0, 0)` },
        ],
        { duration, iterations: Infinity, easing: "linear" }
      );
    };

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(buildAnimation);

    const ro = new ResizeObserver(buildAnimation);
    ro.observe(track);

    // Browsers suspend WAAPI when the tab is hidden; resume on return.
    // pageshow handles bfcache restoration on Safari/Firefox.
    const resume = () => {
      const anim = animationRef.current;
      if (
        document.visibilityState === "visible" &&
        anim &&
        anim.playState !== "running"
      ) {
        anim.play();
      }
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);

    return () => {
      cancelled = true;
      ro.disconnect();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      animationRef.current?.cancel();
      animationRef.current = null;
    };
  }, [snapshot]);

  const handleMouseEnter = () => animationRef.current?.pause();
  const handleMouseLeave = () => animationRef.current?.play();

  if (snapshot.length === 0) return null;

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
            {snapshot.map((item, i) => (
              <span key={i} className="contents">
                <Link
                  href={`/artykul/${item.slug}`}
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
