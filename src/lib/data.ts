import { createClient } from "@supabase/supabase-js";
import type { Article, Category, Tag } from "@/types/database";

// ----- Supabase client (read-only, anon key) -----
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  return createClient(url, key);
}

const supabase = getSupabase();

export type ArticleWithRelations = Article & { category: Category | null; tags: Tag[] };

// ===================== BATCH HELPERS =====================

/** Escape special characters for PostgREST ilike */
function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

/** Attach tags to multiple articles in a single query (eliminates N+1) */
async function attachTagsBatch(
  articles: (Article & { category: Category | null })[]
): Promise<ArticleWithRelations[]> {
  if (articles.length === 0) return [];

  const ids = articles.map((a) => a.id);
  const { data: tagRows, error } = await supabase
    .from("article_tags")
    .select("article_id, tag:tags(*)")
    .in("article_id", ids);

  if (error) {
    console.error("[data] attachTagsBatch failed:", error.message);
    return articles.map((a) => ({ ...a, tags: [] }));
  }

  const tagMap = new Map<string, Tag[]>();
  for (const row of tagRows || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tag = (row as any).tag as Tag | null;
    if (!tag) continue;
    const existing = tagMap.get(row.article_id) || [];
    existing.push(tag);
    tagMap.set(row.article_id, existing);
  }

  return articles.map((a) => ({ ...a, tags: tagMap.get(a.id) || [] }));
}

/** Attach tags to a single article */
async function attachTags(
  article: Article & { category: Category | null }
): Promise<ArticleWithRelations> {
  const results = await attachTagsBatch([article]);
  return results[0];
}

// ===================== DATA ACCESS =====================

export async function getArticles(limit = 10): Promise<ArticleWithRelations[]> {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[data] getArticles failed:", error.message);
    return [];
  }
  if (!articles || articles.length === 0) return [];

  return attachTagsBatch(articles);
}

export async function getFeaturedArticles(): Promise<ArticleWithRelations[]> {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("published_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[data] getFeaturedArticles failed:", error.message);
    return [];
  }
  if (!articles || articles.length === 0) return [];

  return attachTagsBatch(articles);
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithRelations | null> {
  const { data: article, error } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !article) {
    if (error && error.code !== "PGRST116") {
      console.error("[data] getArticleBySlug failed:", error.message);
    }
    return null;
  }

  return attachTags(article);
}

export async function getArticlesByCategory(categorySlug: string): Promise<ArticleWithRelations[]> {
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (catError || !category) return [];

  const { data: articles, error } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .eq("category_id", category.id)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[data] getArticlesByCategory failed:", error.message);
    return [];
  }
  if (!articles || articles.length === 0) return [];

  return attachTagsBatch(articles);
}

export interface PaginatedResult {
  articles: ArticleWithRelations[];
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
}

export async function getArticlesByCategoryPaginated(
  categorySlug: string,
  pageSize = 12,
  cursor?: string,
): Promise<PaginatedResult> {
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (catError || !category) return { articles: [], nextCursor: null, prevCursor: null, total: 0 };

  const { count } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("category_id", category.id);

  let query = supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .eq("category_id", category.id)
    .order("published_at", { ascending: false })
    .limit(pageSize + 1);

  if (cursor) {
    query = query.lt("published_at", cursor);
  }

  const { data: articles, error } = await query;
  if (error) {
    console.error("[data] getArticlesByCategoryPaginated failed:", error.message);
    return { articles: [], nextCursor: null, prevCursor: null, total: count || 0 };
  }
  if (!articles || articles.length === 0) {
    return { articles: [], nextCursor: null, prevCursor: null, total: count || 0 };
  }

  const hasMore = articles.length > pageSize;
  const pageArticles = articles.slice(0, pageSize);
  const withTags = await attachTagsBatch(pageArticles);

  return {
    articles: withTags,
    nextCursor: hasMore ? pageArticles[pageArticles.length - 1].published_at : null,
    prevCursor: cursor || null,
    total: count || 0,
  };
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("[data] getCategories failed:", error.message);
    return [];
  }
  return data || [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}

export async function searchArticles(query: string): Promise<ArticleWithRelations[]> {
  const escaped = escapeIlike(query);
  const { data: articles, error } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[data] searchArticles failed:", error.message);
    return [];
  }
  if (!articles || articles.length === 0) return [];

  return attachTagsBatch(articles);
}

/**
 * Optimized: single query to fetch articles for multiple categories
 * instead of N separate getArticlesByCategory calls.
 */
export async function getArticlesGroupedByCategory(
  categorySlugs: string[],
  limitPerCategory = 4
): Promise<Record<string, ArticleWithRelations[]>> {
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", categorySlugs);

  if (catError || !categories || categories.length === 0) return {};

  const categoryIds = categories.map((c) => c.id);
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  const { data: articles, error } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .in("category_id", categoryIds)
    .order("published_at", { ascending: false });

  if (error || !articles || articles.length === 0) return {};

  // Group by category and limit
  const grouped = new Map<string, (Article & { category: Category | null })[]>();
  for (const article of articles) {
    const slug = slugById.get(article.category_id);
    if (!slug) continue;
    const existing = grouped.get(slug) || [];
    if (existing.length < limitPerCategory) {
      existing.push(article);
      grouped.set(slug, existing);
    }
  }

  // Batch tags for all articles at once
  const allArticles = [...grouped.values()].flat();
  const withTags = await attachTagsBatch(allArticles);

  // Re-group tagged articles
  const taggedMap = new Map(withTags.map((a) => [a.id, a]));
  const result: Record<string, ArticleWithRelations[]> = {};
  for (const [slug, arts] of grouped) {
    result[slug] = arts.map((a) => taggedMap.get(a.id)!).filter(Boolean);
  }

  return result;
}

/**
 * Optimized: count tags in application layer but with a single query
 * (fetches only tag_id + tag data, not full article data).
 */
export async function getPopularTags(limit = 10): Promise<Tag[]> {
  const { data: tagRows, error } = await supabase
    .from("article_tags")
    .select("tag_id, tags(id, name, slug)");

  if (error) {
    console.error("[data] getPopularTags failed:", error.message);
    return [];
  }
  if (!tagRows || tagRows.length === 0) return [];

  const countMap = new Map<string, { tag: Tag; count: number }>();
  for (const row of tagRows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tag = (row as any).tags as Tag | null;
    if (!tag) continue;
    const existing = countMap.get(tag.id);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(tag.id, { tag, count: 1 });
    }
  }

  return [...countMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => e.tag);
}

export async function getSitemapArticles(limit = 5000): Promise<{ slug: string; updated_at: string; is_featured: boolean }[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("slug, updated_at, is_featured")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[data] getSitemapArticles failed:", error.message);
    return [];
  }
  return data || [];
}

export async function getTickerArticles(limit = 10): Promise<{ title: string; slug: string }[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("title, slug")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[data] getTickerArticles failed:", error.message);
    return [];
  }
  return data || [];
}

// ===================== TAG PAGES =====================

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getArticlesByTag(tagSlug: string): Promise<ArticleWithRelations[]> {
  const tag = await getTagBySlug(tagSlug);
  if (!tag) return [];

  const { data: articleTagRows, error: atError } = await supabase
    .from("article_tags")
    .select("article_id")
    .eq("tag_id", tag.id);

  if (atError || !articleTagRows || articleTagRows.length === 0) return [];

  const articleIds = articleTagRows.map((r) => r.article_id);

  const { data: articles, error } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .in("id", articleIds)
    .order("published_at", { ascending: false });

  if (error || !articles || articles.length === 0) return [];

  return attachTagsBatch(articles);
}

// ===================== ALL TAGS (for sitemap) =====================

export async function getAllTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");

  if (error) {
    console.error("[data] getAllTags failed:", error.message);
    return [];
  }
  return data || [];
}
