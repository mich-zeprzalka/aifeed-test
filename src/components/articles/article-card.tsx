import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import type { Article, Category, Tag } from "@/types/database";

interface ArticleCardProps {
  article: Article & { category: Category | null; tags: Tag[] };
  variant?: "default" | "featured" | "compact";
  className?: string;
}

export function ArticleCard({ article, variant = "default", className = "" }: ArticleCardProps) {
  if (variant === "featured") return <FeaturedCard article={article} className={className} />;
  if (variant === "compact") return <CompactCard article={article} className={className} />;
  return <DefaultCard article={article} className={className} />;
}

function FeaturedCard({ article, className }: { article: ArticleCardProps["article"]; className: string }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className={`group relative flex flex-col h-full w-full overflow-hidden rounded-xl bg-card card-hover ${className}`}
    >
      <div className="absolute inset-0 overflow-hidden">
        {article.thumbnail_url ? (
          <Image
            src={article.thumbnail_url}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 via-accent/10 to-muted" />
        )}
      </div>
      <div className="gradient-overlay absolute inset-0 z-10" />
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 z-20 flex flex-col justify-end h-full items-start">
        {article.category && (
          <span className="mb-2 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white/90 bg-white/15 backdrop-blur-md border border-white/10">
            {article.category.name}
          </span>
        )}
        <h2 className="text-xl sm:text-2xl lg:text-3xl text-white line-clamp-3">
          {article.title}
        </h2>
        <p className="hidden md:block text-sm text-white/80 line-clamp-2 mt-3 max-w-2xl">
          {article.excerpt}
        </p>
        <div className="flex items-center gap-2.5 text-xs font-mono tracking-wide text-white/60 mt-4">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {article.reading_time} min
          </span>
          <span className="size-0.5 rounded-full bg-white/30" />
          <span>{formatDate(article.published_at)}</span>
        </div>
      </div>
    </Link>
  );
}

function DefaultCard({ article, className }: { article: ArticleCardProps["article"]; className: string }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className={`group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card card-hover ${className}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {article.thumbnail_url ? (
          <Image
            src={article.thumbnail_url}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {article.category && (
          <span className="mb-2 inline-block w-fit text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
            {article.category.name}
          </span>
        )}
        <h3 className="mb-2 text-base line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {article.title}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {article.excerpt}
        </p>
        <div className="flex items-center gap-3 text-xs font-mono tracking-wide text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3" />
            {article.reading_time} min
          </span>
          <span className="size-0.5 rounded-full bg-muted-foreground/30" />
          <span>{formatDate(article.published_at)}</span>
        </div>
      </div>
    </Link>
  );
}

function CompactCard({ article, className }: { article: ArticleCardProps["article"]; className: string }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className={`group flex gap-4 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted/40 hover:border-border/30 ${className}`}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
        {article.thumbnail_url ? (
          <Image src={article.thumbnail_url} alt={article.title} fill className="object-cover" sizes="96px" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center min-w-0 py-1">
        {article.category && (
          <span className="mb-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
            {article.category.name}
          </span>
        )}
        <h4 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300 pr-2">
          {article.title}
        </h4>
        <span className="mt-2 text-[10px] font-mono text-muted-foreground">
          {formatDate(article.published_at)}
        </span>
      </div>
    </Link>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
