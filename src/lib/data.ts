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

// ===================== DATA ACCESS =====================

export async function getArticles(limit = 10): Promise<ArticleWithRelations[]> {
  const { data: articles } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!articles || articles.length === 0) return [];

  return Promise.all(articles.map(attachTags));
}

export async function getFeaturedArticles(): Promise<ArticleWithRelations[]> {
  const { data: articles } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("published_at", { ascending: false })
    .limit(5);

  if (!articles || articles.length === 0) return [];

  return Promise.all(articles.map(attachTags));
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithRelations | null> {
  const { data: article } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!article) return null;

  return attachTags(article);
}

export async function getArticlesByCategory(categorySlug: string): Promise<ArticleWithRelations[]> {
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (!category) return [];

  const { data: articles } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .eq("category_id", category.id)
    .order("published_at", { ascending: false });

  if (!articles || articles.length === 0) return [];

  return Promise.all(articles.map(attachTags));
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return data || [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  return data || null;
}

export async function searchArticles(query: string): Promise<ArticleWithRelations[]> {
  const { data: articles } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order("published_at", { ascending: false })
    .limit(20);

  if (!articles || articles.length === 0) return [];

  return Promise.all(articles.map(attachTags));
}

export async function getArticlesGroupedByCategory(
  categorySlugs: string[],
  limitPerCategory = 3
): Promise<Record<string, ArticleWithRelations[]>> {
  const result: Record<string, ArticleWithRelations[]> = {};
  await Promise.all(
    categorySlugs.map(async (slug) => {
      const articles = await getArticlesByCategory(slug);
      result[slug] = articles.slice(0, limitPerCategory);
    })
  );
  return result;
}

export async function getPopularTags(limit = 10): Promise<Tag[]> {
  const { data: tagRows } = await supabase
    .from("article_tags")
    .select("tag_id, tags(id, name, slug)");

  if (!tagRows || tagRows.length === 0) return [];

  // Count tag occurrences and pick top ones
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
  const { data } = await supabase
    .from("articles")
    .select("slug, updated_at, is_featured")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  return data || [];
}

// ===================== HELPERS =====================

async function attachTags(article: Article & { category: Category | null }): Promise<ArticleWithRelations> {
  const { data: tagRows } = await supabase
    .from("article_tags")
    .select("tag:tags(*)")
    .eq("article_id", article.id);

  const tags: Tag[] = (tagRows || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => r.tag as Tag | null)
    .filter((t): t is Tag => t !== null);

  return { ...article, tags };
}
