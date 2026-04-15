import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Category } from "@/types/database";

interface CategoryBarProps {
  categories: Category[];
  activeSlug?: string;
}

export function CategoryBar({ categories, activeSlug }: CategoryBarProps) {
  return (
    <div className="border-b border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-2.5 py-4">
            <Link
              href="/"
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !activeSlug
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
