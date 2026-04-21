import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBar } from "@/components/articles/category-bar";
import { getCategories } from "@/lib/data";

export default async function CategoryLoading() {
  const categories = await getCategories(); // We can await this fast call to show the real bar if preferred, but usually CategoryBar is cached or could be a skeleton too.
                                            // Actually, since this is a loading component in App Router, it's safer to just render a static skeleton header or basic categories.

  return (
    <>
      <CategoryBar categories={categories} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-10">
          <Skeleton className="mb-3 h-3 w-16" />
          <Skeleton className="h-10 sm:h-12 w-64 mb-3" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-5 w-full max-w-xl" />
            <Skeleton className="h-5 w-4/5 max-w-lg" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border/50">
              <Skeleton className="aspect-[16/10] w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
