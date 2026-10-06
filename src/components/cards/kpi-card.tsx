import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted text-foreground/70",
  brand: "bg-brand-soft text-brand",
  success: "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300",
  info: "bg-sky-600/10 text-sky-700 dark:bg-sky-400/12 dark:text-sky-300",
  warning: "bg-amber-600/12 text-amber-700 dark:bg-amber-400/12 dark:text-amber-300",
  danger: "bg-rose-600/10 text-rose-700 dark:bg-rose-400/12 dark:text-rose-300",
  violet: "bg-violet-600/10 text-violet-700 dark:bg-violet-400/12 dark:text-violet-300",
} as const;

export type KpiTone = keyof typeof tones;

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: KpiTone;
  hint?: string;
}) {
  return (
    <Card size="sm" className="gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground truncate text-sm font-medium">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              tones[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {hint ? <p className="text-muted-foreground mt-0.5 truncate text-xs">{hint}</p> : null}
      </div>
    </Card>
  );
}
