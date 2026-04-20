import { getArticles } from "@/lib/data";
import { siteConfig } from "@/config/site";

export const revalidate = 3600;

export async function GET() {
  const articles = await getArticles(50);
  const baseUrl = siteConfig.url;

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>${siteConfig.name}</title>
  <link>${baseUrl}</link>
  <description>${siteConfig.description}</description>
  <language>pl</language>
  <managingEditor>redakcja@aifeed.pl (AiFeed)</managingEditor>
  <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <image>
    <url>${baseUrl}/icon.png</url>
    <title>${siteConfig.name}</title>
    <link>${baseUrl}</link>
  </image>
  ${articles
    .map(
      (a) => `<item>
    <title><![CDATA[${a.title}]]></title>
    <link>${baseUrl}/article/${a.slug}</link>
    <description><![CDATA[${a.excerpt}]]></description>
    <pubDate>${a.published_at ? new Date(a.published_at).toUTCString() : ""}</pubDate>
    <guid isPermaLink="true">${baseUrl}/article/${a.slug}</guid>
    <dc:creator>AiFeed</dc:creator>${a.category ? `
    <category>${a.category.name}</category>` : ""}${a.thumbnail_url ? `
    <enclosure url="${a.thumbnail_url}" type="image/jpeg" length="0"/>` : ""}
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
