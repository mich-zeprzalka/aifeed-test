import Link from "next/link";
import { TrendingUp } from "lucide-react";
import type { Tag } from "@/types/database";

interface TrendingTagsProps {
  tags: Tag[];
}

// Server component — no interactive state needed. Mirrors the structure of
// `CategoryBar` (semantic <nav> + role="list" inside) so screen-reader users
// land on a clearly named landmark ("Popularne tagi") just like categories.
// The decorative "Trendy" label is presentational, not a heading: a fresh
// <h2> here would muddy the document outline of the home page (visible h2's
// belong to category sections). The aria-label on <nav> carries the
// accessible name instead.
//
// Rendered only on the home page (other surfaces have their own discovery
// patterns). Returns null for an empty list so the parent doesn't need to
// guard with a conditional — the component owns its own visibility.
export function TrendingTags({ tags }: TrendingTagsProps) {
  if (tags.length === 0) return null;

  return (
    <nav
      aria-label="Popularne tagi"
      className="border-b border-border/30 bg-background"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2 no-scrollbar sm:px-6 lg:px-8">
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          <TrendingUp className="size-3" />
          Trendy
        </span>
        <ul role="list" className="flex items-center gap-2">
          {tags.map((tag) => (
            <li key={tag.id} className="shrink-0 whitespace-nowrap">
              <Link
                href={`/tag/${tag.slug}`}
                className="inline-flex items-center rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span aria-hidden="true" className="mr-0.5 text-primary/60">
                  #
                </span>
                {tag.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
