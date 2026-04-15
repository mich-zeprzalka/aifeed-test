/**
 * Scrapes the full text content of a source article from its URL.
 * Used to provide the AI writer with actual source material
 * instead of just an RSS title/snippet — preventing hallucinations.
 */
export async function scrapeArticleContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });

    if (!res.ok) {
      console.warn(`[Content Scraper] HTTP ${res.status} for ${url}`);
      return "";
    }

    let html = await res.text();

    // ---- Strip non-content elements ----
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    html = html.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");
    html = html.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
    html = html.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
    html = html.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
    html = html.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");
    html = html.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "");
    html = html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");
    html = html.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "");
    html = html.replace(/<!--[\s\S]*?-->/g, "");

    // ---- Find the main article body ----
    // Priority: <article> > <main> > <body>
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    const contentHtml =
      articleMatch?.[1] || mainMatch?.[1] || bodyMatch?.[1] || html;

    // ---- Convert HTML to plain text ----
    let text = contentHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/blockquote>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      // Decode common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#8217;/g, "\u2019")
      .replace(/&#8216;/g, "\u2018")
      .replace(/&#8220;/g, "\u201C")
      .replace(/&#8221;/g, "\u201D")
      .replace(/&#8212;/g, "\u2014")
      .replace(/&#8211;/g, "\u2013")
      // Clean up whitespace
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // ---- Truncate to fit AI token budget (~6000 chars ≈ 1800 tokens) ----
    const MAX_CHARS = 6000;
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS) + "\n\n[treść skrócona]";
    }

    console.log(
      `[Content Scraper] Extracted ${text.length} chars from ${url}`
    );
    return text;
  } catch (error) {
    console.warn(`[Content Scraper] Failed for ${url}:`, error);
    return "";
  }
}
