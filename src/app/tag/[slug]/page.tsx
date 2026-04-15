import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/articles/article-card";
import { getTagBySlug, getArticlesByTag } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: "Tag nie znaleziony" };
  return {
    title: `#${tag.name} — AiFeed`,
    description: `Artykuły oznaczone tagiem #${tag.name}`,
    alternates: {
      canonical: `/tag/${tag.slug}`,
    },
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const articles = await getArticlesByTag(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <span className="mb-3 inline-block text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
          Tag
        </span>
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight text-balance">
          <span className="text-primary">#</span>{tag.name}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {articles.length} {articles.length === 1 ? "artykuł" : articles.length < 5 ? "artykuły" : "artykułów"} z tym tagiem
        </p>
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
          <p className="text-lg text-muted-foreground">Jeszcze brak artykułów z tym tagiem.</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Wpadnij tu niedługo po nowe treści.
          </p>
        </div>
      )}
    </div>
  );
}
