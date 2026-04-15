import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, Calendar } from "lucide-react";
import { getArticleBySlug, getArticles } from "@/lib/data";
import { ArticleCard } from "@/components/articles/article-card";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Artykuł nie znaleziony" };

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.published_at || undefined,
      images: article.thumbnail_url ? [{ url: article.thumbnail_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const allArticles = await getArticles(10);
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: article.thumbnail_url || undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/icon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteConfig.url}/article/${article.slug}` },
    keywords: article.tags.map((t) => t.name).join(", "),
  };

  return (
    <article className="pb-16">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Article header */}
      <header className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Powrót
        </Link>

        {/* Meta */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {article.category && (
            <Link href={`/category/${article.category.slug}`}>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                {article.category.name}
              </span>
            </Link>
          )}
          {article.category && publishedDate && (
            <span className="size-0.5 rounded-full bg-muted-foreground/30" />
          )}
          {publishedDate && (
            <span className="flex items-center gap-1 text-[11px] font-mono tracking-wide text-muted-foreground">
              <Calendar className="size-3" />
              {publishedDate}
            </span>
          )}
          <span className="size-0.5 rounded-full bg-muted-foreground/30" />
          <span className="flex items-center gap-1 text-[11px] font-mono tracking-wide text-muted-foreground">
            <Clock className="size-3" />
            {article.reading_time} min czytania
          </span>
        </div>

        {/* Title */}
        <h1
          className="mb-6 text-[2.25rem] sm:text-[3rem] lg:text-[4rem] font-extrabold leading-[1.1] tracking-tight text-balance text-foreground"
        >
          {article.title}
        </h1>

        {/* Excerpt */}
        <p className="mb-8 text-lg text-muted-foreground leading-relaxed max-w-2xl">
          {article.excerpt}
        </p>
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
            <p className="mt-2 text-center text-[11px] font-mono text-muted-foreground/60">
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
        <div className="prose-article">{renderMarkdown(article.content)}</div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap items-center gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Sources */}
        {article.source_urls.length > 0 && (
          <div className="mt-8 rounded-xl border border-border/50 bg-card p-5">
            <h3 className="mb-4 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Źródła
            </h3>
            <ul className="space-y-1.5">
              {article.source_urls.map((url, i) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    {article.source_titles[i] || url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
  );
}

// Markdown-to-JSX renderer
function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match headings: # through ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      // Render h1 content as h2 (page already has h1 for title)
      const Tag = level <= 2 ? "h2" : "h3";
      elements.push(<Tag key={i}>{processInline(text)}</Tag>);
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote key={i}>
          {quoteLines.map((l, j) => (
            <p key={j}>{processInline(l)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i}>
          {listItems.map((item, j) => (
            <li key={j}>{processInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={i}>
          {listItems.map((item, j) => (
            <li key={j}>{processInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim() === "---") {
      elements.push(<hr key={i} />);
      i++;
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("- ") &&
      !/^\d+\.\s/.test(lines[i]) &&
      lines[i].trim() !== "---"
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(<p key={i}>{processInline(paraLines.join(" "))}</p>);
    } else {
      // Safety: skip any unhandled line to prevent infinite loop
      i++;
    }
  }

  return <>{elements}</>;
}

function processInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] && match[3]) {
      parts.push(
        <a key={match.index} href={match[3]} target="_blank" rel="noopener noreferrer">
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(<strong key={match.index}>{match[4]}</strong>);
    } else if (match[5]) {
      parts.push(<code key={match.index}>{match[5]}</code>);
    } else if (match[6]) {
      parts.push(<em key={match.index}>{match[6]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
