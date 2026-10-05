"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  MinusCircleIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { InspectionItemResult, InspectionSeverity } from "@/types/inspection";

const RESULT_META: Record<
  InspectionItemResult,
  { icon: LucideIcon; className: string }
> = {
  pass: {
    icon: CheckCircle2Icon,
    className:
      "bg-emerald-700/12 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100",
  },
  fail: {
    icon: XCircleIcon,
    className: "bg-rose-700/12 text-rose-950 dark:bg-rose-300/15 dark:text-rose-100",
  },
  advisory: {
    icon: AlertTriangleIcon,
    className: "bg-amber-700/12 text-amber-950 dark:bg-amber-300/15 dark:text-amber-100",
  },
  not_applicable: {
    icon: MinusCircleIcon,
    className: "bg-stone-600/12 text-stone-900 dark:bg-stone-300/15 dark:text-stone-100",
  },
  not_tested: {
    icon: CircleDashedIcon,
    className: "bg-sky-700/12 text-sky-950 dark:bg-sky-300/15 dark:text-sky-100",
  },
};

const SEVERITY_META: Record<InspectionSeverity, string> = {
  info: "bg-sky-700/12 text-sky-950 dark:bg-sky-300/15 dark:text-sky-100",
  minor: "bg-stone-600/12 text-stone-900 dark:bg-stone-300/15 dark:text-stone-100",
  moderate: "bg-amber-700/12 text-amber-950 dark:bg-amber-300/15 dark:text-amber-100",
  major: "bg-orange-700/12 text-orange-950 dark:bg-orange-300/15 dark:text-orange-100",
  critical: "bg-rose-700/12 text-rose-950 dark:bg-rose-300/15 dark:text-rose-100",
};

export function InspectionItemResultBadge({
  result,
}: {
  result: InspectionItemResult | null;
}) {
  const t = useTranslations();
  if (!result) {
    return (
      <span className="text-muted-foreground text-xs">{t("inspections.fields.notSet")}</span>
    );
  }

  const meta = RESULT_META[result];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {t(`inspections.itemResults.${result}`)}
    </span>
  );
}

export function InspectionSeverityBadge({
  severity,
}: {
  severity: InspectionSeverity | null;
}) {
  const t = useTranslations();
  if (!severity) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        SEVERITY_META[severity],
      )}
    >
      {t(`inspections.severities.${severity}`)}
    </span>
  );
}
