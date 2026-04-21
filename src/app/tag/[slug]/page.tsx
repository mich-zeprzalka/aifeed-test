import { notFound } from "next/navigation";
import { Hash } from "lucide-react";
import { ArticleCard } from "@/components/articles/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getTagBySlug, getArticlesByTag } from "@/lib/data";
import { siteConfig } from "@/config/site";
import { jsonLdScript } from "@/lib/jsonld";
import type { Metadata } from "next";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) {
    return {
      title: "Tag nie znaleziony",
      robots: { index: false, follow: false },
    };
  }
  const description = `Najnowsze artykuły oznaczone tagiem #${tag.name} — wiadomości, analizy i raporty AI. Czytaj na AiFeed.`;
  return {
    title: `#${tag.name} — AiFeed`,
    description,
    openGraph: {
      title: `#${tag.name} — AiFeed`,
      description,
      type: "website",
      url: `${siteConfig.url}/tag/${tag.slug}`,
      siteName: siteConfig.name,
      locale: "pl_PL",
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `#${tag.name} — AiFeed`,
      description,
    },
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

  const collectionJsonLd = articles.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `#${tag.name}`,
    description: `Artykuły oznaczone tagiem #${tag.name}`,
    url: `${siteConfig.url}/tag/${tag.slug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: articles.length,
      itemListElement: articles.slice(0, 20).map((article, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteConfig.url}/article/${article.slug}`,
        name: article.title,
      })),
    },
  } : null;

  return (
    <>
    {collectionJsonLd && (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(collectionJsonLd) }}
      />
    )}
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <span className="mb-2 inline-block text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
          Tag
        </span>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-balance">
          <span className="text-primary">#</span>{tag.name}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
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
        <EmptyState
          icon={Hash}
          title="Jeszcze brak artykułów z tym tagiem"
          description="Wpadnij tu niedługo po nowe treści."
        />
      )}
    </div>
    </>
  );
}
