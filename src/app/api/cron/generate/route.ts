import { NextRequest } from "next/server";
import { scrapeAllFeeds, selectTopArticles } from "@/lib/scraper/parser";
import { scrapeArticleContent } from "@/lib/scraper/content";
import { generateArticle } from "@/lib/ai/writer";
import { assessArticleQuality } from "@/lib/ai/quality";
import { getArticleThumbnail } from "@/lib/images/generator";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import slugify from "slugify";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Generate a unique slug for the article. Prefers a clean, human-readable slug;
 * falls back to a short timestamp suffix only when the base slug collides.
 */
async function buildUniqueSlug(supabase: SupabaseClient, title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true, locale: "pl" }).slice(0, 80) || "artykul";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await supabase.from("articles").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  // Last-resort uniqueness guarantee — base36 timestamp is short enough
  return `${base}-${Date.now().toString(36)}`;
}

async function runPipeline(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Step 1: Scrape RSS feeds
    console.log("Scraping RSS feeds...");
    const scrapedItems = await scrapeAllFeeds();
    console.log(`Found ${scrapedItems.length} items`);

    // Step 2: Deduplicate against already-processed items
    const { data: existingItems } = await supabase
      .from("scraped_items")
      .select("source_url")
      .in(
        "source_url",
        scrapedItems.map((i) => i.url)
      );

    const existingUrls = new Set((existingItems || []).map((i) => i.source_url));
    const newItems = scrapedItems.filter((i) => !existingUrls.has(i.url));
    console.log(`${newItems.length} new items after deduplication`);

    if (newItems.length === 0) {
      return Response.json({ message: "No new items to process", generated: 0 });
    }

    // Step 3: Select top articles (configurable via ?count=N, default 10)
    const url = new URL(request.url);
    const count = Math.min(parseInt(url.searchParams.get("count") || "10", 10) || 10, 15);
    const topItems = selectTopArticles(newItems, count);

    // Step 4: Generate articles
    const generated: string[] = [];
    const rejected: string[] = [];
    const failed: { title: string; reason: string }[] = [];

    for (const item of topItems) {
      try {
        console.log(`Generating article for: ${item.title}`);

        // Scrape full source content for faithful adaptation
        const sourceContent = await scrapeArticleContent(item.url);
        console.log(`[Source content] ${sourceContent.length} chars from ${item.url}`);

        if (sourceContent.length < 100) {
          console.warn(`[Pipeline] Skipping "${item.title}" — source content too short or unreadable`);
          failed.push({ title: item.title, reason: "source-too-short" });
          // Still mark as processed so we don't retry bad URLs
          await supabase.from("scraped_items").upsert(
            { source_url: item.url, title: item.title, description: item.description, source_name: item.sourceName, is_processed: true },
            { onConflict: "source_url" }
          );
          continue;
        }

        const article = await generateArticle(item.title, [item.url], [item.description], sourceContent);

        // Validate AI response — reject refusals and garbage
        const refusalPatterns = ["nie można przetworzyć", "nie mogę", "brak treści", "brak czytelnej"];
        const isRefusal = refusalPatterns.some((p) => article.content.toLowerCase().includes(p));

        if (isRefusal) {
          console.warn(`[Pipeline] AI refused for "${item.title}", skipping`);
          failed.push({ title: item.title, reason: "ai-refusal" });
          await supabase.from("scraped_items").upsert(
            { source_url: item.url, title: item.title, description: item.description, source_name: item.sourceName, is_processed: true },
            { onConflict: "source_url" }
          );
          continue;
        }

        // Quality gate — reject low-quality articles
        const quality = assessArticleQuality(article);
        console.log(`[Quality] "${article.title}" — score: ${quality.score}/100${quality.issues.length > 0 ? `, issues: ${quality.issues.join(", ")}` : ""}`);

        if (quality.score < 50) {
          console.warn(`[Pipeline] Rejecting "${article.title}" — quality score ${quality.score}/100: ${quality.issues.join(", ")}`);
          rejected.push(article.title);
          await supabase.from("scraped_items").upsert(
            { source_url: item.url, title: item.title, description: item.description, source_name: item.sourceName, is_processed: true },
            { onConflict: "source_url" }
          );
          continue;
        }

        // Ensure the original source URL is always in source_urls
        const sourceUrls = [item.url];
        const sourceTitles = [item.sourceName];

        const thumbnail = await getArticleThumbnail(article.title, item.url);

        const slug = await buildUniqueSlug(supabase, article.title);

        // Find category
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", article.category)
          .maybeSingle();

        // Insert article
        const { data: insertedArticle, error: insertError } = await supabase
          .from("articles")
          .insert({
            title: article.title,
            slug,
            excerpt: article.excerpt,
            content: article.content,
            category_id: category?.id || null,
            thumbnail_url: thumbnail.url || null,
            thumbnail_source: thumbnail.source,
            source_urls: sourceUrls,
            source_titles: sourceTitles,
            reading_time: article.reading_time,
            is_featured: generated.length === 0,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError || !insertedArticle) {
          console.error(`Failed to insert article: ${insertError?.message}`);
          failed.push({ title: item.title, reason: `insert-failed: ${insertError?.message || "unknown"}` });
          continue;
        }

        // Handle tags — upsert each tag then link to article
        for (const tagName of article.tags) {
          const tagSlug = slugify(tagName, { lower: true, strict: true, locale: "pl" });

          const { data: tag } = await supabase
            .from("tags")
            .upsert({ name: tagName, slug: tagSlug }, { onConflict: "slug" })
            .select("id")
            .single();

          if (tag) {
            await supabase
              .from("article_tags")
              .upsert(
                { article_id: insertedArticle.id, tag_id: tag.id },
                { onConflict: "article_id,tag_id" }
              );
          }
        }

        // Mark source as processed
        await supabase.from("scraped_items").upsert(
          {
            source_url: item.url,
            title: item.title,
            description: item.description,
            source_name: item.sourceName,
            is_processed: true,
          },
          { onConflict: "source_url" }
        );

        generated.push(article.title);
        console.log(`Generated: ${article.title}`);
      } catch (error) {
        console.error(`Failed to generate article for "${item.title}":`, error);
        failed.push({ title: item.title, reason: String(error) });
      }
    }

    return Response.json({
      message: `Generated ${generated.length} articles`,
      generated,
      rejected,
      failed,
      scraped: scrapedItems.length,
      new: newItems.length,
    });
  } catch (error) {
    console.error("Pipeline error:", error);
    return Response.json(
      { error: "Pipeline failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Vercel Cron triggers GET requests
export async function GET(request: NextRequest) {
  return runPipeline(request);
}

// Manual triggers via POST also supported
export async function POST(request: NextRequest) {
  return runPipeline(request);
}
