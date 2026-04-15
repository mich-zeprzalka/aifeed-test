import { NextRequest } from "next/server";
import { scrapeAllFeeds, selectTopArticles } from "@/lib/scraper/parser";
import { scrapeArticleContent } from "@/lib/scraper/content";
import { generateArticle } from "@/lib/ai/writer";
import { getArticleThumbnail } from "@/lib/images/generator";
import { createAdminClient } from "@/lib/supabase/admin";
import slugify from "slugify";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

    // Step 3: Select top articles (1 for cost testing)
    const topItems = selectTopArticles(newItems, 1);

    // Step 4: Generate articles
    const generated: string[] = [];

    for (const item of topItems) {
      try {
        console.log(`Generating article for: ${item.title}`);

        // Scrape full source content for faithful adaptation
        const sourceContent = await scrapeArticleContent(item.url);
        console.log(`[Source content] ${sourceContent.length} chars from ${item.url}`);

        const article = await generateArticle(item.title, [item.url], [item.description], sourceContent);

        // Ensure the original source URL is always in source_urls
        const sourceUrls = [item.url];
        const sourceTitles = [item.sourceName];

        const thumbnail = await getArticleThumbnail(
          article.title,
          item.url,
          item.sourceName
        );

        const slug =
          slugify(article.title, { lower: true, strict: true, locale: "pl" })
            .slice(0, 80) +
          "-" +
          Date.now().toString(36);

        // Find category
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", article.category)
          .single();

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
      }
    }

    return Response.json({
      message: `Generated ${generated.length} articles`,
      generated,
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

export async function GET() {
  return Response.json({ status: "ok", endpoint: "cron/generate" });
}
