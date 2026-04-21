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
  const activeSlug = pathname.startsWith("/category/")
    ? pathname.split("/")[2]
    : undefined;
  const isHome = pathname === "/";
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount; persist on scroll.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed)) el.scrollLeft = parsed;
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sessionStorage.setItem(SCROLL_STORAGE_KEY, String(el.scrollLeft));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav aria-label="Kategorie" className="border-b border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={scrollerRef}
          role="tablist"
          className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3"
        >
          <Link
            href="/"
            role="tab"
            aria-selected={isHome && !activeSlug}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isHome && !activeSlug
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Wszystko
          </Link>
          {categories.map((cat) => {
            const isActive = activeSlug === cat.slug;
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                role="tab"
                aria-selected={isActive}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
