"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FileWarningIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { InspectionResult } from "@/types/inspection";

const RESULT_META: Record<InspectionResult, { icon: LucideIcon; className: string }> = {
  pass: {
    icon: CheckCircle2Icon,
    className:
      "bg-emerald-700/12 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100",
  },
  pass_with_advisories: {
    icon: FileWarningIcon,
    className: "bg-amber-700/12 text-amber-950 dark:bg-amber-300/15 dark:text-amber-100",
  },
  repair_required: {
    icon: AlertTriangleIcon,
    className: "bg-orange-700/12 text-orange-950 dark:bg-orange-300/15 dark:text-orange-100",
  },
  fail: {
    icon: XCircleIcon,
    className: "bg-rose-700/12 text-rose-950 dark:bg-rose-300/15 dark:text-rose-100",
  },
};

export function InspectionResultBadge({ result }: { result: InspectionResult | null }) {
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
      {t(`inspections.results.${result}`)}
    </span>
  );
}
