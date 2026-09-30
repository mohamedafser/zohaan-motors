import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--sidebar)" />
        <path
          d="M9 11.5h14M23 11.5 9 20.5M9 20.5h14"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showName ? (
        <span className="truncate text-sm font-semibold tracking-tight">{appConfig.name}</span>
      ) : null}
    </span>
  );
}
