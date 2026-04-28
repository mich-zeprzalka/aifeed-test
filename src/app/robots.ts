import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Disallow API routes, admin area, search query pages, and Next.js'
      // internal data prefetch endpoints. Search is noindex'd in page-level
      // metadata too, but the Disallow keeps crawlers from even attempting
      // arbitrary `?q=...` permutations. `/_next/data/` would otherwise leak
      // JSON variants of pages into search results.
      disallow: ["/api/", "/admin/", "/szukaj", "/_next/data/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
