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

/** Soft corner glow behind the card, matching the icon tone. */
const glows: Record<KpiTone, string> = {
  neutral: "bg-foreground/5",
  brand: "bg-brand/25",
  success: "bg-emerald-500/15",
  info: "bg-sky-500/15",
  warning: "bg-amber-500/15",
  danger: "bg-rose-500/15",
  violet: "bg-violet-500/15",
};

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
    <Card
      size="sm"
      className="group/kpi hover:ring-brand/30 relative isolate gap-3 px-4 py-4 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span
        className={cn(
          "pointer-events-none absolute -end-10 -top-10 -z-10 size-28 rounded-full opacity-70 blur-2xl transition-all duration-500 group-hover/kpi:scale-125 group-hover/kpi:opacity-100",
          glows[tone],
        )}
        aria-hidden
      />
      {tone === "brand" ? (
        <span className="bg-gold absolute inset-x-0 top-0 h-0.5" aria-hidden />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground line-clamp-2 text-sm leading-snug font-medium">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ease-(--ease-spring) group-hover/kpi:scale-110 group-hover/kpi:-rotate-6",
              tones[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="font-heading truncate text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint ? <p className="text-muted-foreground mt-0.5 truncate text-xs">{hint}</p> : null}
      </div>
    </Card>
  );
}
