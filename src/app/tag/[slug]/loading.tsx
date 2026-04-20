import { Skeleton } from "@/components/ui/skeleton";

export default function TagLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="mb-10">
        <Skeleton className="mb-3 h-3 w-10" />
        <Skeleton className="h-10 sm:h-12 w-48 mb-3" />
        <Skeleton className="mt-3 h-5 w-40" />
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
  );
}
