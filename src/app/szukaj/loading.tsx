import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <Skeleton className="mx-auto mb-6 h-12 w-64" />
        <Skeleton className="mx-auto h-12 w-full max-w-lg rounded-xl" />
      </div>
    </div>
  );
}
