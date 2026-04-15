import Parser from "rss-parser";
import { RSS_SOURCES } from "./sources";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "AiFeed/1.0 (AI News Aggregator)",
  },
});

export interface ScrapedArticle {
  title: string;
  description: string;
  url: string;
  sourceName: string;
  category: string;
  publishedAt: Date;
}

export async function scrapeAllFeeds(): Promise<ScrapedArticle[]> {
  const results: ScrapedArticle[] = [];

  const feedPromises = RSS_SOURCES.map(async (source) => {
    try {
      const feed = await parser.parseURL(source.url);
      const items = (feed.items || []).slice(0, 10); // Max 10 per source

      for (const item of items) {
        if (!item.title || !item.link) continue;

        // Filter AI-related content
        const text = `${item.title} ${item.contentSnippet || ""}`.toLowerCase();
        const aiKeywords = ["ai", "artificial intelligence", "machine learning", "llm", "gpt", "claude", "gemini", "neural", "deep learning", "model", "transformer", "openai", "anthropic", "meta ai", "mistral", "copilot", "chatgpt", "midjourney", "stable diffusion", "hugging face", "nvidia", "deepmind", "reasoning", "agentic"];
        const isAIRelated = aiKeywords.some((kw) => text.includes(kw));

        // Company blogs are always AI-related
        const alwaysAI = source.name.includes("Blog") || source.name.includes("DeepMind") || source.name.includes("Hugging Face");
        if (!isAIRelated && !alwaysAI) {
          continue;
        }

        results.push({
          title: item.title,
          description: item.contentSnippet || item.content || "",
          url: item.link,
          sourceName: source.name,
          category: source.category,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
    } catch (error) {
      console.error(`Failed to scrape ${source.name}:`, error);
    }
  });

  await Promise.allSettled(feedPromises);

  // Sort by date (newest first) and deduplicate by URL
  const seen = new Set<string>();
  return results
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
}

export function selectTopArticles(articles: ScrapedArticle[], count = 10): ScrapedArticle[] {
  // Greedy selection: pick best-scoring article one at a time,
  // applying diversity penalty based on already-selected sources.
  const sourceCount = new Map<string, number>();
  const selected: ScrapedArticle[] = [];
  const used = new Set<number>();

  for (let pick = 0; pick < count && pick < articles.length; pick++) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < articles.length; i++) {
      if (used.has(i)) continue;
      const article = articles[i];
      const hoursOld = (Date.now() - article.publishedAt.getTime()) / 3600000;
      const freshnessScore = Math.max(0, 100 - hoursOld * 2);
      const diversityPenalty = (sourceCount.get(article.sourceName) || 0) * 20;
      const score = freshnessScore - diversityPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    used.add(bestIdx);
    const chosen = articles[bestIdx];
    sourceCount.set(chosen.sourceName, (sourceCount.get(chosen.sourceName) || 0) + 1);
    selected.push(chosen);
  }

  return selected;
}
