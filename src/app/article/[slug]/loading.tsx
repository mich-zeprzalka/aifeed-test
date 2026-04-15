import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ArticleLoading() {
  return (
    <article className="pb-16 animate-pulse">
      {/* Header skeleton */}
      <header className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground/50 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Powrót
        </Link>

        {/* Meta skeleton */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-0.5 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Title skeleton */}
        <div className="mb-6 space-y-2">
          <Skeleton className="h-10 sm:h-14 lg:h-16 w-full" />
          <Skeleton className="h-10 sm:h-14 lg:h-16 w-4/5" />
        </div>

        {/* Excerpt skeleton */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </header>

      {/* Hero image skeleton */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mb-10">
        <Skeleton className="aspect-[2/1] w-full rounded-xl" />
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[98%]" />
          <Skeleton className="h-4 w-[95%]" />
          <Skeleton className="h-4 w-[99%]" />
          <Skeleton className="h-4 w-4/5 mt-4" />
          {/* Paragraph space */}
          <div className="h-4" />
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[97%]" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[96%]" />
        </div>
      </div>
    </article>
  );
}
