import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder shaped like a list table while the first page loads. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card ring-foreground/[0.07] overflow-hidden rounded-xl shadow-xs ring-1">
      <div className="bg-muted/50 h-10 border-b" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b px-3 py-3 last:border-0">
          <Skeleton className="size-11 shrink-0 rounded-lg" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="hidden h-5 w-24 rounded-full sm:block" />
          <Skeleton className="hidden h-8 w-16 md:block" />
        </div>
      ))}
    </div>
  );
}
