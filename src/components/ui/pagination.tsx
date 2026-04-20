import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  basePath: string;
  nextCursor: string | null;
  hasPrev: boolean;
  total: number;
  pageSize: number;
  className?: string;
}

export function Pagination({
  basePath,
  nextCursor,
  hasPrev,
  total,
  pageSize,
  className,
}: PaginationProps) {
  if (!hasPrev && !nextCursor) return null;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <nav
      aria-label="Paginacja"
      className={cn("flex items-center justify-between gap-4 pt-10", className)}
    >
      <div className="text-[12px] font-mono text-muted-foreground/60">
        {total > 0 && `${total} artykuł${total === 1 ? "" : total < 5 ? "y" : "ów"} · ${totalPages} str.`}
      </div>

      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            href={basePath}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3.5 py-2 text-body-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-3.5" />
            Nowsze
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 px-3.5 py-2 text-body-sm font-medium text-muted-foreground/40 cursor-not-allowed">
            <ChevronLeft className="size-3.5" />
            Nowsze
          </span>
        )}

        {nextCursor ? (
          <Link
            href={`${basePath}?cursor=${encodeURIComponent(nextCursor)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3.5 py-2 text-body-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Starsze
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 px-3.5 py-2 text-body-sm font-medium text-muted-foreground/40 cursor-not-allowed">
            Starsze
            <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
