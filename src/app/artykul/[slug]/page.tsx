import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock, ExternalLink, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { getArticleBySlug, getArticles, getAdjacentArticles } from "@/lib/data";
import { ArticleCard } from "@/components/articles/article-card";
import { Breadcrumbs } from "@/components/articles/breadcrumbs";
import { ShareButtons } from "@/components/articles/share-buttons";
import { ReadingProgress } from "@/components/articles/reading-progress";
import { TableOfContents } from "@/components/articles/table-of-contents";
import { siteConfig } from "@/config/site";
import { jsonLdScript } from "@/lib/jsonld";
import { slugifyHeading } from "@/lib/heading-id";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const getCachedArticle = cache((slug: string) => getArticleBySlug(slug));

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getCachedArticle(slug);
  if (!article) {
    return {
      title: "Artykuł nie znaleziony",
      robots: { index: false, follow: false },
    };
  }

  // Google recommends providing explicit OG image dimensions so crawlers don't
  // have to fetch the image to determine size. 1200×630 is the universal
  // recommendation for `summary_large_image`.
  const ogImage = article.thumbnail_url
    ? { url: article.thumbnail_url, width: 1200, height: 630, alt: article.title }
    : { url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name };

  const tagNames = article.tags.map((t) => t.name);

  return {
    title: article.title,
    description: article.excerpt,
    keywords: tagNames.length > 0 ? tagNames : undefined,
    authors: [{ name: siteConfig.name, url: siteConfig.url }],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      url: `${siteConfig.url}/artykul/${article.slug}`,
      siteName: siteConfig.name,
      locale: "pl_PL",
      publishedTime: article.published_at || undefined,
      modifiedTime: article.updated_at || article.published_at || undefined,
      authors: [siteConfig.url],
      section: article.category?.name,
      tags: tagNames,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [ogImage.url],
    },
    alternates: {
      canonical: `/artykul/${article.slug}`,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getCachedArticle(slug);
  if (!article) notFound();

  const [allArticles, adjacent] = await Promise.all([
    getArticles(10),
    article.category_id && article.published_at
      ? getAdjacentArticles(article.id, article.category_id, article.published_at)
      : Promise.resolve({ prev: null, next: null }),
  ]);
  const relatedArticles = allArticles
    .filter((a) => a.id !== article.id && a.category_id === article.category_id)
    .slice(0, 3);

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const articleUrl = `${siteConfig.url}/artykul/${article.slug}`;

  const breadcrumbItems = [
    { label: "Strona główna", href: "/" },
    ...(article.category
      ? [{ label: article.category.name, href: `/kategoria/${article.category.slug}` }]
      : []),
    { label: article.title },
  ];

  // NewsArticle JSON-LD — Google's News structured data spec.
  // `image` as an array of URLs (recommended over a single string), skipped
  // entirely when no thumbnail is available (better than an empty field).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title.slice(0, 110), // Google caps headline at 110 chars
    description: article.excerpt,
    ...(article.thumbnail_url && { image: [article.thumbnail_url] }),
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/icon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    ...(article.tags.length > 0 && { keywords: article.tags.map((t) => t.name).join(", ") }),
    inLanguage: "pl-PL",
    isAccessibleForFree: true,
    ...(article.category?.name && { articleSection: article.category.name }),
  };

  return (
    <>
      <ReadingProgress />

      <article className="pb-16">
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
        />

        {/* Article header */}
        <header className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs items={breadcrumbItems} />
          </div>

          {/* Meta */}
          <div className="mb-5 flex items-center gap-3">
            {publishedDate && (
              <span className="flex items-center gap-1.5 text-xs font-mono tracking-wide text-muted-foreground">
                <Calendar className="size-3" />
                {publishedDate}
              </span>
            )}
            <span className="size-0.5 rounded-full bg-muted-foreground/30" />
            <span className="flex items-center gap-1.5 text-xs font-mono tracking-wide text-muted-foreground">
              <Clock className="size-3" />
              {article.reading_time} min czytania
            </span>
          </div>

          {/* Title */}
          <h1
            className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-[1.15] tracking-tight text-balance text-foreground"
          >
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="mb-5 text-base text-muted-foreground leading-relaxed max-w-2xl">
            {article.excerpt}
          </p>

          {/* Share */}
          <div className="mb-6">
            <ShareButtons url={articleUrl} title={article.title} />
          </div>
        </header>

        {/* Hero image — full width within container */}
        {article.thumbnail_url && (
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mb-10">
            <div className="relative aspect-[2/1] overflow-hidden rounded-xl">
              <Image
                src={article.thumbnail_url}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                priority
              />
            </div>
            {article.thumbnail_source && article.source_urls[0] && (
              <p className="mt-2 text-center text-xs font-mono text-muted-foreground/60">
                Źródło zdjęcia:{" "}
                <a
                  href={article.source_urls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
                >
                  {article.thumbnail_source}
                </a>
              </p>
            )}
          </div>
        )}

        {/* Article content */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {article.content && (
            <TableOfContents content={article.content} />
          )}
          <div className="prose-article">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...props }) => {
                  const id = slugifyHeading(String(children));
                  return <h2 id={id} {...props}>{children}</h2>;
                },
                h3: ({ children, ...props }) => {
                  const id = slugifyHeading(String(children));
                  return <h3 id={id} {...props}>{children}</h3>;
                },
                a: ({ href, children, ...props }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>

          {/* Tags — trending style */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap items-center gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="shrink-0 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <span className="text-primary/60 mr-0.5">#</span>{tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Share (bottom) — minimal */}
          <div className="mt-10 pt-8 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Udostępnij
            </span>
            <ShareButtons url={articleUrl} title={article.title} />
          </div>

          {/* Sources — minimal */}
          {article.source_urls.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border/40">
              <h3 className="mb-3 text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
                Źródła
              </h3>
              <ul className="space-y-1.5">
                {article.source_urls.map((url, i) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground/50" />
                      {article.source_titles[i] || url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Prev / Next navigation */}
        {(adjacent.prev || adjacent.next) && (
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-8">
            <div className="flex items-stretch gap-3 border-t border-border/40 pt-6">
              {adjacent.prev ? (
                <Link
                  href={`/artykul/${adjacent.prev.slug}`}
                  className="group flex-1 flex items-start gap-2.5 rounded-lg border border-border/40 p-3 transition-all hover:border-primary/30 hover:bg-muted/20"
                >
                  <ChevronLeft className="size-3.5 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Poprzedni</p>
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {adjacent.prev.title}
                    </p>
                  </div>
                </Link>
              ) : <div className="flex-1" />}
              {adjacent.next ? (
                <Link
                  href={`/artykul/${adjacent.next.slug}`}
                  className="group flex-1 flex items-start gap-2.5 rounded-lg border border-border/40 p-3 transition-all hover:border-primary/30 hover:bg-muted/20 text-right"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Następny</p>
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {adjacent.next.title}
                    </p>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ) : <div className="flex-1" />}
            </div>
          </div>
        )}

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-16">
            <hr className="mb-10 border-border/40" />
            <h2
              className="mb-6 text-2xl font-bold tracking-tight"
            >
              Podobne Publikacje
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
