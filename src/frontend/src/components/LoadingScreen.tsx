import { Skeleton } from "@/components/ui/skeleton";

const STAT_CARDS = [0, 1, 2, 3];
const VIEW_TABS = [0, 1, 2, 3, 4];
const TABLE_ROWS = [0, 1, 2, 3, 4, 5, 6, 7];

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[99999] bg-background overflow-auto">
      {/* Header skeleton */}
      <div className="border-b border-border/40 px-4 sm:px-6 py-4 sm:py-5">
        <div className="container mx-auto">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Title section */}
        <div className="text-center space-y-3 py-4">
          <Skeleton className="h-10 w-96 mx-auto max-w-full" />
          <Skeleton className="h-1 w-24 mx-auto" />
          <Skeleton className="h-5 w-72 mx-auto max-w-full" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-20" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CARDS.map((i) => (
            <div
              key={i}
              className="border border-border/40 rounded-lg p-4 space-y-2"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>

        {/* View toggle bar skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <div className="flex gap-2">
            {VIEW_TABS.map((i) => (
              <Skeleton key={i} className="h-8 w-16" />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border/40">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="divide-y divide-border/30">
            {TABLE_ROWS.map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
