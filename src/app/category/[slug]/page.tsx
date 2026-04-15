import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/articles/article-card";
import { CategoryBar } from "@/components/articles/category-bar";
import { getArticlesByCategory, getCategories, getCategoryBySlug } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Kategoria nie znaleziona" };
  return {
    title: `${category.name} — AiFeed`,
    description: category.description || `Najnowsze wiadomości AI w kategorii ${category.name}`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const [category, categories, articles] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
    getArticlesByCategory(slug),
  ]);

  if (!category) notFound();

  return (
    <>
      <CategoryBar categories={categories} activeSlug={slug} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <span className="mb-3 inline-block text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, i) => (
              <div key={article.id} className={`animate-fade-in-up stagger-${i + 1}`}>
                <ArticleCard article={article} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <p className="text-lg text-muted-foreground">Jeszcze brak artykułów.</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Wpadnij tu niedługo po nowe treści.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
