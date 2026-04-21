import { getSitemapArticles, getCategories, getAllTags } from "@/lib/data";
import { siteConfig } from "@/config/site";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;
  const [articles, categories, tags] = await Promise.all([
    getSitemapArticles(5000),
    getCategories(),
    getAllTags(),
  ]);

  const articleUrls = articles.map((article) => ({
    url: `${baseUrl}/artykul/${article.slug}`,
    lastModified: new Date(article.updated_at),
    changeFrequency: "weekly" as const,
    priority: article.is_featured ? 0.9 : 0.7,
  }));

  const categoryUrls = categories.map((cat) => ({
    url: `${baseUrl}/kategoria/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const tagUrls = tags.map((tag) => ({
    url: `${baseUrl}/tag/${tag.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}/o-serwisie`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/polityka-prywatnosci`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    // /szukaj intentionally omitted — it's noindex'd (thin content) and has
    // no standalone value as a discoverable URL.
    ...categoryUrls,
    ...tagUrls,
    ...articleUrls,
  ];
}
