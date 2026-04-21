"use client";

import Link from "next/link";
import { memo } from "react";

interface TickerItem {
  title: string;
  slug: string;
}

interface NewsTickerProps {
  items: TickerItem[];
}

function NewsTickerImpl({ items }: NewsTickerProps) {
  if (items.length === 0) return null;

  return (
    <aside
      aria-label="Najnowsze artykuły"
      className="border-b border-border bg-foreground overflow-hidden pause-on-hover"
    >
      <div className="flex">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="animate-marquee flex items-center whitespace-nowrap"
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
