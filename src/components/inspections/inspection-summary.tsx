"use client";

import { useTranslations } from "next-intl";

import { useAppLocale } from "@/components/inventory/inventory-utils";
import { KpiCard } from "@/components/cards/kpi-card";
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
  "criticalFindings",
] as const satisfies readonly (keyof Summary)[];

export function InspectionSummary({ summary }: { summary?: Summary }) {
  const t = useTranslations();
  const locale = useAppLocale();

  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7"
      aria-label={t("inspections.summary.pending")}
    >
      {summaryKeys.map((key) =>
        summary ? (
          <KpiCard
            key={key}
            label={t(`inspections.summary.${key}`)}
            value={formatNumber(summary[key], locale)}
          />
        ) : (
          <Skeleton key={key} className="h-[88px] rounded-xl" />
        ),
      )}
    </section>
  );
}
