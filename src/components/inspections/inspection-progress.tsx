"use client";

import { cn } from "@/lib/utils";

export function InspectionProgressBar({
  completed,
  total,
  label,
  className,
}: {
  completed: number;
  total: number;
  label?: string;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? <p className="text-muted-foreground text-xs">{label}</p> : null}
      <div
        className="bg-muted h-2.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function InspectionProgress({
  completed,
  total,
  label,
  className,
}: {
  completed: number;
  total: number;
  label?: string;
  className?: string;
}) {
  return (
    <InspectionProgressBar
      completed={completed}
      total={total}
      label={label}
      className={className}
    />
  );
}
