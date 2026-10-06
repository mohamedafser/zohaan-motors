"use client";

import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  FileCheckIcon,
  GaugeIcon,
  RotateCcwIcon,
  UserIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InspectionStatus } from "@/types/inspection";

const META: Record<InspectionStatus, { icon: LucideIcon; className: string }> = {
  draft: {
    icon: ClipboardListIcon,
    className:
      "border-stone-500/30 bg-stone-500/10 text-stone-800 dark:text-stone-200",
  },
  assigned: {
    icon: UserIcon,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200",
  },
  in_progress: {
    icon: GaugeIcon,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  },
  submitted: {
    icon: FileCheckIcon,
    className:
      "border-indigo-500/30 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200",
  },
  under_review: {
    icon: ClipboardCheckIcon,
    className:
      "border-orange-500/30 bg-orange-500/10 text-orange-900 dark:text-orange-200",
  },
  approved: {
    icon: CheckCircle2Icon,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  rejected: {
    icon: XCircleIcon,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  },
  cancelled: {
    icon: RotateCcwIcon,
    className:
      "border-stone-500/30 bg-stone-500/10 text-stone-800 dark:text-stone-200",
  },
};

export function InspectionStatusBadge({
  status,
  className,
}: {
  status: InspectionStatus;
  className?: string;
}) {
  const t = useTranslations();
  const meta = META[status];
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={cn(meta.className, className)}>
      <Icon data-icon="inline-start" aria-hidden />
      {t(`inspections.status.${status}`)}
    </Badge>
  );
}
