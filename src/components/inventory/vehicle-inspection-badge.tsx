"use client";

import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  FileWarningIcon,
  GaugeIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VehicleInspectionFilter } from "@/types/vehicle";

export const VEHICLE_INSPECTION_ICONS: Record<VehicleInspectionFilter, LucideIcon> = {
  not_inspected: ClipboardListIcon,
  in_progress: GaugeIcon,
  pass: CheckCircle2Icon,
  pass_with_issues: FileWarningIcon,
  fail: XCircleIcon,
  approved: ClipboardCheckIcon,
};

const META: Record<
  VehicleInspectionFilter,
  { icon: LucideIcon; className: string }
> = {
  not_inspected: {
    icon: ClipboardListIcon,
    className:
      "border-stone-500/30 bg-stone-500/10 text-stone-800 dark:text-stone-200",
  },
  in_progress: {
    icon: GaugeIcon,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  },
  pass: {
    icon: CheckCircle2Icon,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  pass_with_issues: {
    icon: FileWarningIcon,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  },
  fail: {
    icon: XCircleIcon,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  },
  approved: {
    icon: ClipboardCheckIcon,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
};

export function VehicleInspectionBadge({
  value,
  className,
}: {
  value: VehicleInspectionFilter | null | undefined;
  className?: string;
}) {
  const t = useTranslations();
  const label: VehicleInspectionFilter = value && value in META ? value : "not_inspected";
  const meta = META[label];
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={cn(meta.className, className)}>
      <Icon data-icon="inline-start" aria-hidden />
      {t(`inventory.inspectionFilter.${label}`)}
    </Badge>
  );
}
