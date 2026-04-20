import { notFound } from "next/navigation";
import { Newspaper } from "lucide-react";
import { ArticleCard } from "@/components/articles/article-card";
import { CategoryBar } from "@/components/articles/category-bar";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumbs } from "@/components/articles/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategories, getCategoryBySlug, getArticlesByCategoryPaginated } from "@/lib/data";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

export const revalidate = 300;

const PAGE_SIZE = 12;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Kategoria nie znaleziona" };
  return {
    title: `${category.name} — AiFeed`,
    description: `Najnowsze artykuły w kategorii ${category.name} — ${category.description || "wiadomości, analizy i raporty AI"}. Czytaj na AiFeed.`,
    alternates: {
      canonical: `/category/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { cursor } = await searchParams;

  const [category, categories, paginated] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
    getArticlesByCategoryPaginated(slug, PAGE_SIZE, cursor),
  ]);

  if (!category) notFound();

  const { articles, nextCursor, total } = paginated;

  const itemListJsonLd = articles.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category.name,
    numberOfItems: articles.length,
    itemListElement: articles.map((article, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteConfig.url}/article/${article.slug}`,
      name: article.title,
    })),
  } : null;

  return (
    <>
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <CategoryBar categories={categories} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Strona główna", href: "/" },
            { label: category.name },
          ]}
        />

        {/* Header */}
        <div className="mb-10 mt-4">
          <span className="mb-3 inline-block text-label font-mono font-bold uppercase tracking-widest text-muted-foreground">
            Kategoria
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight text-balance">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-3 text-lg text-muted-foreground max-w-xl">
              {category.description}
            </p>
          )}
        </div>

        {articles.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article, i) => (
                <div key={article.id} className={`animate-fade-in-up stagger-${i + 1}`}>
                  <ArticleCard article={article} />
                </div>
              ))}
            </div>

            <Pagination
              basePath={`/category/${slug}`}
              nextCursor={nextCursor}
              hasPrev={!!cursor}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </>
        ) : (
          <EmptyState
            icon={Newspaper}
            title="Jeszcze brak artykułów w tej kategorii"
            description="Wpadnij tu niedługo po nowe treści."
          />
        )}
      </div>
    </>
  );
}
