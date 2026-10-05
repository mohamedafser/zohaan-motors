"use client";

import { useTranslations } from "next-intl";

import { KpiCard } from "@/components/cards/kpi-card";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils/currency";
import type { InventorySummary } from "@/types/vehicle";

const summaryKeys = [
  "total",
  "readyForSale",
  "underInspection",
  "underRepair",
  "reserved",
  "sold",
] as const satisfies readonly (keyof InventorySummary)[];

export function VehicleSummary({ summary }: { summary?: InventorySummary }) {
  const t = useTranslations();
  const locale = useAppLocale();

  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      aria-label={t("inventory.summary.total")}
    >
      {summaryKeys.map((key) =>
        summary ? (
          <KpiCard
            key={key}
            label={t(`inventory.summary.${key}`)}
            value={formatNumber(summary[key], locale)}
          />
        ) : (
          <Skeleton key={key} className="h-[88px] rounded-xl" />
        ),
      )}
    </section>
  );
}
