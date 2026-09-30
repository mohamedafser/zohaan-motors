import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  available: "bg-emerald-700/12 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100",
  reserved: "bg-amber-700/12 text-amber-950 dark:bg-amber-300/15 dark:text-amber-100",
  workshop: "bg-sky-700/12 text-sky-950 dark:bg-sky-300/15 dark:text-sky-100",
  sold: "bg-stone-600/12 text-stone-900 dark:bg-stone-300/15 dark:text-stone-100",
  new: "bg-sky-700/12 text-sky-950 dark:bg-sky-300/15 dark:text-sky-100",
  contacted: "bg-amber-700/12 text-amber-950 dark:bg-amber-300/15 dark:text-amber-100",
  qualified: "bg-emerald-700/12 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100",
  draft: "bg-stone-600/12 text-stone-900 dark:bg-stone-300/15 dark:text-stone-100",
  confirmed: "bg-emerald-700/12 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        statusStyles[status] ?? "bg-muted text-foreground",
      )}
    >
      {label}
    </span>
  );
}
