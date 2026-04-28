"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Category } from "@/types/database";

interface CategoryBarProps {
  categories: Category[];
}

const SCROLL_STORAGE_KEY = "aifeed:category-bar-scroll";

export function CategoryBar({ categories }: CategoryBarProps) {
  const pathname = usePathname();
  const activeSlug = pathname.startsWith("/kategoria/")
    ? pathname.split("/")[2]
    : undefined;
  const isHome = pathname === "/";
  const isHidden = pathname.startsWith("/artykul/");
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount; persist on scroll. sessionStorage
  // throws QuotaExceededError in Safari private mode and SecurityError when
  // disabled by site settings — wrapped so a private-tab user never breaks
  // the bar entirely.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    try {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed)) el.scrollLeft = parsed;
      }
    } catch {
      // sessionStorage unavailable — degrade gracefully, no scroll restore.
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        try {
          sessionStorage.setItem(SCROLL_STORAGE_KEY, String(el.scrollLeft));
        } catch {
          // ignore — scroll position is non-critical
        }
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Hidden on single article pages — owner decision: the article surface
  // stays focused on the content. Use nav + aria-current="page" rather than
  // role="tablist"/role="tab" (tabs imply an ARIA-associated tabpanel; these
  // links navigate to a new route, which is nav semantics, not tabs).
  if (isHidden) return null;

  return (
    <nav aria-label="Kategorie" className="border-b border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={scrollerRef}
          className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3"
        >
          <Link
            href="/"
            aria-current={isHome ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
              isHome
                ? "bg-foreground text-background font-bold shadow-sm"
                : "text-muted-foreground font-medium hover:text-foreground hover:bg-muted"
            }`}
          >
            Wszystko
          </Link>
          {categories.map((cat) => {
            const isActive = activeSlug === cat.slug;
            return (
              <Link
                key={cat.slug}
                href={`/kategoria/${cat.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-foreground text-background font-bold shadow-sm"
                    : "text-muted-foreground font-medium hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
