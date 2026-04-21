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

    // One track width = first copy width. We animate by that distance so the
    // second copy seamlessly replaces it.
    const firstCopy = track.firstElementChild as HTMLElement | null;
    if (!firstCopy) return;

    const distance = firstCopy.offsetWidth;
    if (distance === 0) return;

    const duration = (distance / PIXELS_PER_SECOND) * 1000;

    const anim = track.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        { transform: `translate3d(-${distance}px, 0, 0)` },
      ],
      {
        duration,
        iterations: Infinity,
        easing: "linear",
      }
    );
    animationRef.current = anim;

    // Browsers suspend WAAPI when tab hidden; resume on return.
    const resume = () => {
      if (document.visibilityState === "visible" && anim.playState !== "running") {
        anim.play();
      }
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);

    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      anim.cancel();
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

export const NewsTicker = memo(NewsTickerImpl);
