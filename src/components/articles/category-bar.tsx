"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useCallback } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Category } from "@/types/database";

interface CategoryBarProps {
  categories: Category[];
}

export function CategoryBar({ categories }: CategoryBarProps) {
  const pathname = usePathname();
  const activeSlug = pathname.startsWith("/category/")
    ? pathname.split("/")[2]
    : undefined;
  const isHome = pathname === "/";
  const activeRef = useRef<HTMLAnchorElement>(null);

  const scrollToActive = useCallback(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }
  }, []);

  useEffect(() => {
    scrollToActive();
  }, [activeSlug, scrollToActive]);

  return (
    <div className="border-b border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-2.5 py-4">
            <Link
              href="/"
              ref={isHome && !activeSlug ? activeRef : undefined}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isHome && !activeSlug
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Wszystko
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                ref={activeSlug === cat.slug ? activeRef : undefined}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeSlug === cat.slug
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>
    </div>
  );
}
