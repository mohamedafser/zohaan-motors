"use client";

import {
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  EyeIcon,
  TimerIcon,
  UserCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useAppLocale } from "@/components/inventory/inventory-utils";
import { KpiCard, type KpiTone } from "@/components/cards/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils/currency";
import type { InspectionSummary as Summary } from "@/types/inspection";

const summaryKeys = [
  "pending",
  "myInspections",
  "inProgress",
  "awaitingReview",
  "approved",
  "rejected",
] as const satisfies readonly (keyof Summary)[];

const summaryVisuals = {
  pending: { icon: ClockIcon, tone: "neutral" },
  myInspections: { icon: UserCheckIcon, tone: "brand" },
  inProgress: { icon: TimerIcon, tone: "info" },
  awaitingReview: { icon: EyeIcon, tone: "warning" },
  approved: { icon: CircleCheckIcon, tone: "success" },
  rejected: { icon: CircleXIcon, tone: "danger" },
} satisfies Record<(typeof summaryKeys)[number], { icon: typeof ClockIcon; tone: KpiTone }>;

export function InspectionSummary({ summary }: { summary?: Summary }) {
  const t = useTranslations();
  const locale = useAppLocale();

  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      aria-label={t("inspections.summary.pending")}
    >
      {summaryKeys.map((key) =>
        summary ? (
          <KpiCard
            key={key}
            label={t(`inspections.summary.${key}`)}
            value={formatNumber(summary[key], locale)}
            icon={summaryVisuals[key].icon}
            tone={summaryVisuals[key].tone}
          />
        ) : (
          <Skeleton key={key} className="h-[104px] rounded-xl" />
        ),
      )}
    </section>
  );
}
