import { PageHeaderSkeleton, PageSkeleton } from "@/components/feedback/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Header with Mark all read / Clear all, then the notification cards. */
export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton actions={2} />
      <div className="grid gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="bg-card flex items-start gap-3 rounded-xl border p-4 shadow-xs">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
