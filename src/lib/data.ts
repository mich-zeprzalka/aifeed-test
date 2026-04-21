import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Article, Category, Tag } from "@/types/database";
import { sanitizeOrQuery } from "@/lib/search-utils";

// ----- Supabase client (read-only, anon key) -----
// Uses anon key (not server.ts cookie client) because all data access here is
// public read-only — no RLS row ownership needed. Lazy singleton — constructed
// on first use so importing this module doesn't require env vars at build time.
let _client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  _client = createClient(url, key);
  return _client;
}

export type ArticleWithRelations = Article & { category: Category | null; tags: Tag[] };

// ===================== BATCH HELPERS =====================

/** Attach tags to multiple articles in a single query (eliminates N+1) */
async function attachTagsBatch(
  articles: (Article & { category: Category | null })[]
): Promise<ArticleWithRelations[]> {
  if (articles.length === 0) return [];

  const ids = articles.map((a) => a.id);
  const { data: tagRows, error } = await db()
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
  const { data: articles, error } = await db()
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
  const { data: articles, error } = await db()
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
  const { data: article, error } = await db()
    .from("articles")
    .select("*, category:categories(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("[data] getArticleBySlug failed:", error.message);
    return null;
  }
  if (!article) return null;

  return attachTags(article);
}

/**
 * Fetch articles for a category (non-paginated). Bounded by `limit` to
 * prevent unbounded responses as the dataset grows.
 */
export async function getArticlesByCategory(
  categorySlug: string,
  limit = 50
): Promise<ArticleWithRelations[]> {
  const { data: category, error: catError } = await db()
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (catError || !category) return [];

  const { data: articles, error } = await db()
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .eq("category_id", category.id)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[data] getArticlesByCategory failed:", error.message);
    return [];
  }
  if (!articles || articles.length === 0) return [];

  return attachTagsBatch(articles);
}

export interface PaginatedResult {
  articles: ArticleWithRelations[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/**
 * Offset-based pagination for category listings. Uses page numbers so that
 * "Previous" navigates to `page - 1` (not back to page 1 like the previous
 * cursor-only scheme).
 */
export async function getArticlesByCategoryPaginated(
  categorySlug: string,
  pageSize = 12,
  page = 1,
): Promise<PaginatedResult> {
  const safePage = Math.max(1, Math.floor(page) || 1);

  const { data: category, error: catError } = await db()
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (catError || !category) {
    return { articles: [], page: safePage, pageSize, total: 0, totalPages: 0, hasPrev: false, hasNext: false };
  }

  const { count } = await db()
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("category_id", category.id);

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  if (total === 0 || from >= total) {
    return { articles: [], page: safePage, pageSize, total, totalPages, hasPrev: safePage > 1, hasNext: false };
  }

  const { data: articles, error } = await db()
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .eq("category_id", category.id)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error || !articles || articles.length === 0) {
    if (error) console.error("[data] getArticlesByCategoryPaginated failed:", error.message);
    return { articles: [], page: safePage, pageSize, total, totalPages, hasPrev: safePage > 1, hasNext: false };
  }

  const withTags = await attachTagsBatch(articles);

  return {
    articles: withTags,
    page: safePage,
    pageSize,
    total,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await db()
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
  const { data, error } = await db()
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[data] getCategoryBySlug failed:", error.message);
    return null;
  }
  return data;
}

export async function searchArticles(query: string): Promise<ArticleWithRelations[]> {
  const safe = sanitizeOrQuery(query);
  if (!safe.trim()) return [];

  const { data: articles, error } = await db()
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`)
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
  const { data: categories, error: catError } = await db()
    .from("categories")
    .select("id, slug")
    .in("slug", categorySlugs);

  if (catError || !categories || categories.length === 0) return {};

  const categoryIds = categories.map((c) => c.id);
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  // Bounded pull: at most N categories × 10× per-category limit — plenty of
  // headroom to fill the per-category quota without scanning the whole table.
  const pullLimit = Math.max(categoryIds.length * limitPerCategory * 10, 200);

  const { data: articles, error } = await db()
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .in("category_id", categoryIds)
    .order("published_at", { ascending: false })
    .limit(pullLimit);

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
 * Fetch popular tags ranked by usage count.
 * Prefers the Supabase RPC `popular_tags(tag_limit)` (server-side GROUP BY).
 * Falls back to in-memory aggregation if the RPC is missing (older DBs).
 */
export async function getPopularTags(limit = 10): Promise<Tag[]> {
  const rpc = await db().rpc("popular_tags", { tag_limit: limit });
  if (!rpc.error && Array.isArray(rpc.data)) {
    return rpc.data.map((row: { id: string; name: string; slug: string }) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
    }));
  }

  // Fallback — only runs when the RPC hasn't been deployed yet.
  console.warn("[data] getPopularTags RPC missing, falling back to in-memory aggregate");
  const { data: countRows, error: countError } = await db()
    .from("article_tags")
    .select("tag_id");

  if (countError || !countRows || countRows.length === 0) return [];

  const countMap = new Map<string, number>();
  for (const row of countRows) {
    countMap.set(row.tag_id, (countMap.get(row.tag_id) || 0) + 1);
  }

  const topTagIds = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const { data: tags, error: tagError } = await db()
    .from("tags")
    .select("id, name, slug")
    .in("id", topTagIds);

  if (tagError || !tags) return [];

  const tagMap = new Map(tags.map((t) => [t.id, t as Tag]));
  return topTagIds.map((id) => tagMap.get(id)).filter(Boolean) as Tag[];
}

export async function getSitemapArticles(limit = 5000): Promise<{ slug: string; updated_at: string; is_featured: boolean }[]> {
  const { data, error } = await db()
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
  const { data, error } = await db()
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
  const { data, error } = await db()
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[data] getTagBySlug failed:", error.message);
    return null;
  }
  return data;
}

export async function getArticlesByTag(tagSlug: string, limit = 50): Promise<ArticleWithRelations[]> {
  const tag = await getTagBySlug(tagSlug);
  if (!tag) return [];

  const { data: articleTagRows, error: atError } = await db()
    .from("article_tags")
    .select("article_id")
    .eq("tag_id", tag.id);

  if (atError || !articleTagRows || articleTagRows.length === 0) return [];

  const articleIds = articleTagRows.map((r) => r.article_id);

  const { data: articles, error } = await db()
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .in("id", articleIds)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !articles || articles.length === 0) return [];

  return attachTagsBatch(articles);
}

// ===================== ADJACENT ARTICLES =====================

export interface AdjacentArticle {
  slug: string;
  title: string;
}

export interface AdjacentArticles {
  prev: AdjacentArticle | null;
  next: AdjacentArticle | null;
}

/**
 * Get previous and next articles in the same category, ordered by published_at.
 * "Previous" = older, "Next" = newer.
 */
export async function getAdjacentArticles(
  articleId: string,
  categoryId: string,
  publishedAt: string
): Promise<AdjacentArticles> {
  const [prevResult, nextResult] = await Promise.all([
    db()
      .from("articles")
      .select("slug, title")
      .eq("is_published", true)
      .eq("category_id", categoryId)
      .neq("id", articleId)
      .lt("published_at", publishedAt)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db()
      .from("articles")
      .select("slug, title")
      .eq("is_published", true)
      .eq("category_id", categoryId)
      .neq("id", articleId)
      .gt("published_at", publishedAt)
      .order("published_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    prev: prevResult.data || null,
    next: nextResult.data || null,
  };
}

// ===================== ALL TAGS (for sitemap) =====================

export async function getAllTags(): Promise<Tag[]> {
  const { data, error } = await db()
    .from("tags")
    .select("*")
    .order("name");

  if (error) {
    console.error("[data] getAllTags failed:", error.message);
    return [];
  }
  return data || [];
}
