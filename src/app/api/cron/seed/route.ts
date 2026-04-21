import { NextRequest } from "next/server";
import { generateArticle } from "@/lib/ai/writer";
import { scrapeArticleContent } from "@/lib/scraper/content";
import { getArticleThumbnail } from "@/lib/images/generator";
import { createAdminClient } from "@/lib/supabase/admin";
import slugify from "slugify";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Topics per category to ensure full coverage
const SEED_TOPICS: Record<string, { topic: string; sources: string[] }[]> = {
  "modele-ai": [
    { topic: "Claude 4 Opus — najnowszy model Anthropic wyznacza nowe standardy w rozumowaniu", sources: ["https://www.anthropic.com/news"] },
    { topic: "GPT-5 od OpenAI — przecieki sugerują ogromny skok jakościowy", sources: ["https://openai.com/blog"] },
    { topic: "Google Gemini 2.0 Ultra — wielomodalne AI które rozumie obraz, tekst i kod", sources: ["https://blog.google/technology/ai/"] },
    { topic: "Llama 4 od Meta — open source model dorównujący GPT-4o", sources: ["https://ai.meta.com/blog/"] },
  ],
  "badania": [
    { topic: "Naukowcy z MIT opracowali nową architekturę transformerów zużywającą 90% mniej energii", sources: ["https://www.technologyreview.com/"] },
    { topic: "DeepMind rozwiązuje problem fałdowania białek z 99% dokładnością dzięki AlphaFold 3", sources: ["https://deepmind.google/"] },
    { topic: "Przełom w AI: sieci neuronowe uczą się rozumować jak ludzie poprzez chain-of-thought", sources: ["https://arxiv.org/"] },
  ],
  "biznes": [
    { topic: "Microsoft inwestuje 10 miliardów dolarów w infrastrukturę AI w Europie", sources: ["https://techcrunch.com/category/artificial-intelligence/"] },
    { topic: "Startupy AI w Polsce — rosnący ekosystem przyciąga zagranicznych inwestorów", sources: ["https://venturebeat.com/category/ai/"] },
    { topic: "NVIDIA osiąga rekordowe przychody dzięki boomowi na chipy AI", sources: ["https://techcrunch.com/category/artificial-intelligence/"] },
  ],
  "etyka": [
    { topic: "EU AI Act oficjalnie wchodzi w życie — co to oznacza dla firm technologicznych", sources: ["https://www.theverge.com/ai-artificial-intelligence/"] },
    { topic: "Deepfake'i zagrażają wyborom — jak AI zmienia dezinformację polityczną", sources: ["https://www.technologyreview.com/"] },
    { topic: "Anthropic publikuje raport o bezpieczeństwie AI — nowe standardy odpowiedzialnego rozwoju", sources: ["https://www.anthropic.com/news"] },
  ],
  "narzedzia": [
    { topic: "Cursor AI rewolucjonizuje programowanie — IDE przyszłości z wbudowanym AI", sources: ["https://www.theverge.com/ai-artificial-intelligence/"] },
    { topic: "Midjourney V7 generuje fotorealistyczne obrazy nie do odróżnienia od zdjęć", sources: ["https://techcrunch.com/category/artificial-intelligence/"] },
    { topic: "NotebookLM od Google — AI asystent który czyta i analizuje twoje dokumenty", sources: ["https://blog.google/technology/ai/"] },
  ],
  "poradniki": [
    { topic: "Jak zbudować chatbota z RAG używając LangChain i Supabase — kompletny poradnik", sources: ["https://python.langchain.com/docs/"] },
    { topic: "Fine-tuning modeli AI w praktyce — od teorii do wdrożenia produkcyjnego", sources: ["https://huggingface.co/blog"] },
    { topic: "Prompt engineering w 2025 — zaawansowane techniki pisania promptów dla LLM", sources: ["https://docs.anthropic.com/"] },
  ],
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const categoryFilter = url.searchParams.get("category"); // optional: seed only one category
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  try {
    const supabase = createAdminClient();
    const generated: string[] = [];
    const errors: string[] = [];
    let count = 0;

    const categoriesToProcess = categoryFilter
      ? { [categoryFilter]: SEED_TOPICS[categoryFilter] || [] }
      : SEED_TOPICS;

    for (const [categorySlug, topics] of Object.entries(categoriesToProcess)) {
      if (count >= limit) break;

      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .single();

      if (!category) {
        errors.push(`Category not found: ${categorySlug}`);
        continue;
      }

      for (const { topic, sources } of topics) {
        if (count >= limit) break;

        try {
          console.log(`[seed] Generating: ${topic}`);
          const sourceContent = await scrapeArticleContent(sources[0]);
          const article = await generateArticle(topic, sources, [topic], sourceContent);

          const thumbnail = await getArticleThumbnail(article.title, sources[0]);

          const slug =
            slugify(article.title, { lower: true, strict: true, locale: "pl" })
              .slice(0, 80) +
            "-" +
            Date.now().toString(36);

          const { data: inserted, error: insertError } = await supabase
            .from("articles")
            .insert({
              title: article.title,
              slug,
              excerpt: article.excerpt,
              content: article.content,
              category_id: category.id,
              thumbnail_url: thumbnail.url || null,
              thumbnail_source: thumbnail.source,
              source_urls: sources,
              source_titles: [topic.split("—")[0].trim()],
              reading_time: article.reading_time,
              is_featured: count < 3,
              is_published: true,
              published_at: new Date(Date.now() - count * 3600000).toISOString(),
            })
            .select("id")
            .single();

          if (insertError) {
            errors.push(`Insert failed for "${topic}": ${insertError.message}`);
            continue;
          }

          // Tags
          for (const tagName of article.tags) {
            const tagSlug = slugify(tagName, { lower: true, strict: true, locale: "pl" });
            const { data: tag } = await supabase
              .from("tags")
              .upsert({ name: tagName, slug: tagSlug }, { onConflict: "slug" })
              .select("id")
              .single();
            if (tag && inserted) {
              await supabase
                .from("article_tags")
                .upsert({ article_id: inserted.id, tag_id: tag.id }, { onConflict: "article_id,tag_id" });
            }
          }

          generated.push(`[${categorySlug}] ${article.title}`);
          count++;
          console.log(`[seed] Done (${count}): ${article.title}`);
        } catch (error) {
          errors.push(`Failed "${topic}": ${String(error)}`);
          console.error(`[seed] Error for "${topic}":`, error);
        }
      }
    }

    return Response.json({ generated: generated.length, articles: generated, errors });
  } catch (error) {
    return Response.json({ error: "Seed failed", details: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    status: "ok",
    endpoint: "cron/seed",
    categories: Object.keys(SEED_TOPICS),
    totalTopics: Object.values(SEED_TOPICS).reduce((s, t) => s + t.length, 0),
  });
}
