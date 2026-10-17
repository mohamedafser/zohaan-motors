import {
  FilterBarSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/feedback/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

/** Header, four summary tiles, the five tabs with search, then booking cards. */
export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton actions={1} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {range(4).map((index) => (
          <div
            key={index}
            className="bg-card ring-foreground/[0.07] grid gap-2 rounded-xl px-3 py-2.5 shadow-xs ring-1 sm:p-4"
          >
            {/* Phones: the compact row (icon, label, value). */}
            <div className="flex items-center gap-2.5 sm:hidden">
              <Skeleton
                className={
                  index === 0
                    ? "bg-brand-soft size-8 shrink-0 rounded-lg"
                    : "size-8 shrink-0 rounded-lg"
                }
              />
              <div className="grid flex-1 gap-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
            <div className="flex items-center justify-between max-sm:hidden">
              <Skeleton className="h-3 w-20" />
              <Skeleton
                className={index === 0 ? "bg-brand-soft size-8 rounded-lg" : "size-8 rounded-lg"}
              />
            </div>
            <Skeleton className="h-7 w-16 max-sm:hidden" />
            <Skeleton className="h-3 w-28 max-sm:hidden" />
          </div>
        ))}
      </div>
      <FilterBarSkeleton tabs={5} />
      <div className="grid gap-3">
        {range(5).map((index) => (
          <div
            key={index}
            className="bg-card ring-foreground/[0.07] relative grid gap-4 overflow-hidden rounded-xl p-4 ps-5 shadow-xs ring-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:items-center lg:gap-6"
          >
            <span className="bg-muted absolute inset-y-0 start-0 w-1" aria-hidden />
            <div className="flex items-start gap-3">
              <Skeleton className="hidden size-11 shrink-0 rounded-xl sm:block" />
              <div className="grid flex-1 gap-2">
                <div className="flex justify-between gap-2 lg:justify-start">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="grid gap-2 border-t pt-3 lg:border-0 lg:pt-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-6 w-36 rounded-lg" />
            </div>
            <div className="flex gap-1.5 border-t pt-3 lg:border-0 lg:pt-0">
              <Skeleton className="h-10 flex-1 lg:h-9 lg:w-32 lg:flex-none" />
              <Skeleton className="size-10 lg:size-9" />
            </div>
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
