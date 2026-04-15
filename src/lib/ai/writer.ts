import { ARTICLE_SYSTEM_PROMPT, ARTICLE_USER_PROMPT } from "./prompts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Robustly extract metadata JSON from the AI response.
 * Tries multiple delimiter patterns, then falls back to finding
 * the last JSON block in the response.
 */
function extractMeta(
  responseText: string
): Partial<GeneratedArticle> & { _content: string } {
  // Strategy 1: Try known delimiter patterns (case-insensitive)
  const delimiterPattern = /^-{3,}\s*META\s*-{3,}$/im;
  const delimiterMatch = responseText.match(delimiterPattern);

  let contentPart: string;
  let metaRaw: string | null = null;

  if (delimiterMatch) {
    const idx = responseText.indexOf(delimiterMatch[0]);
    contentPart = responseText.slice(0, idx).trim();
    metaRaw = responseText.slice(idx + delimiterMatch[0].length).trim();
  } else {
    // Strategy 2: Find the last JSON object with "title" key in the response
    const jsonPattern = /\{[^{}]*"title"\s*:\s*"[^"]+?"[^{}]*\}/g;
    const matches = [...responseText.matchAll(jsonPattern)];

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      contentPart = responseText.slice(0, lastMatch.index).trim();
      metaRaw = lastMatch[0];
      console.warn("[Writer] META delimiter not found, extracted JSON by pattern match");
    } else {
      console.error("[Writer] No META section and no JSON block found in AI response");
      return { _content: responseText.trim() };
    }
  }

  // Clean up markdown code fences and parse JSON
  const jsonStr = metaRaw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return { ...parsed, _content: contentPart };
  } catch (e) {
    // Strategy 3: Try to fix common JSON issues (trailing commas, smart quotes)
    try {
      const fixed = jsonStr
        .replace(/,\s*}/g, "}")        // trailing commas
        .replace(/,\s*]/g, "]")        // trailing commas in arrays
        .replace(/[\u201C\u201D]/g, '"') // smart quotes → straight
        .replace(/[\u2018\u2019]/g, "'");
      const parsed = JSON.parse(fixed);
      console.warn("[Writer] META JSON required fixup to parse");
      return { ...parsed, _content: contentPart };
    } catch {
      console.error("[Writer] Failed to parse META JSON:", e);
      console.error("[Writer] Raw META:", jsonStr.slice(0, 500));
      return { _content: contentPart };
    }
  }
}

export interface GeneratedArticle {
  content: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  reading_time: number;
}

export async function generateArticle(
  topic: string,
  sourceUrls: string[],
  sourceDescriptions: string[],
  sourceContent: string = ""
): Promise<GeneratedArticle> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "AiFeed",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: ARTICLE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: ARTICLE_USER_PROMPT(topic, sourceUrls, sourceDescriptions, sourceContent),
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000), // 90s timeout per article
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || "";

  // Log token usage and cost for monitoring
  const usage = data.usage;
  if (usage) {
    console.log(`[AI Cost] Tokens — prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`);
  }
  if (data.usage?.total_cost !== undefined) {
    console.log(`[AI Cost] Total cost: $${data.usage.total_cost}`);
  }

  // Split content and metadata — flexible delimiter matching
  const meta = extractMeta(responseText);
  const content = meta._content;

  return {
    content,
    title: meta.title || topic,
    excerpt: meta.excerpt || content.slice(0, 200),
    category: meta.category || "modele-ai",
    tags: meta.tags || [],
    reading_time: meta.reading_time || Math.ceil(content.split(/\s+/).length / 200),
  };
}
