import { getArticles } from "@/lib/data";
import { siteConfig } from "@/config/site";

export const revalidate = 3600;

export async function GET() {
  const articles = await getArticles(50);
  const baseUrl = siteConfig.url;

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${siteConfig.name}</title>
  <link>${baseUrl}</link>
  <description>${siteConfig.description}</description>
  <language>pl</language>
  <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${articles
    .map(
      (a) => `<item>
    <title><![CDATA[${a.title}]]></title>
    <link>${baseUrl}/article/${a.slug}</link>
    <description><![CDATA[${a.excerpt}]]></description>
    <pubDate>${a.published_at ? new Date(a.published_at).toUTCString() : ""}</pubDate>
    <guid isPermaLink="true">${baseUrl}/article/${a.slug}</guid>
  </item>`
    )
    .join("\n  ")}
</channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
