import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Disallow API routes, admin area, and search query pages. Search is
      // noindex'd in page-level metadata too, but the Disallow keeps crawlers
      // from even attempting arbitrary `?q=...` permutations.
      disallow: ["/api/", "/admin/", "/szukaj"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
