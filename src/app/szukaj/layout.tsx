import { searchPageMetadata } from "@/lib/seo";

// Search result pages have thin, query-dependent content. `searchPageMetadata`
// sets `robots: { index: false, follow: true }` — canonical page stays
// crawlable so internal links work, but Google won't spawn SERP entries for
// arbitrary `?q=...` permutations.
export const metadata = searchPageMetadata();

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
