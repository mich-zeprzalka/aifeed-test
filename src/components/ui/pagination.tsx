import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  className?: string;
}

function hrefForPage(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

export function Pagination({
  basePath,
  page,
  totalPages,
  total,
  hasPrev,
  hasNext,
  className,
}: PaginationProps) {
  if (!hasPrev && !hasNext) return null;

  return (
    <nav
      aria-label="Paginacja"
      className={cn("flex items-center justify-between gap-4 pt-10", className)}
    >
      <div className="text-[12px] font-mono text-muted-foreground/60">
        {total > 0 && `${total} artykuł${total === 1 ? "" : total < 5 ? "y" : "ów"} · str. ${page}/${totalPages}`}
      </div>

      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            href={hrefForPage(basePath, page - 1)}
            rel="prev"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-3.5" />
            Nowsze
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 px-3.5 py-2 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
          >
            <ChevronLeft className="size-3.5" />
            Nowsze
          </span>
        )}

        {hasNext ? (
          <Link
            href={hrefForPage(basePath, page + 1)}
            rel="next"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Starsze
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 px-3.5 py-2 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
          >
            Starsze
            <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
