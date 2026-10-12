"use client";

import {
  BadgeCheckIcon,
  CalendarCheckIcon,
  CarIcon,
  HandCoinsIcon,
  TruckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { KpiCard, type KpiTone } from "@/components/cards/kpi-card";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils/currency";
import type { InventorySummary } from "@/types/vehicle";

const summaryKeys = [
  "total",
  "inTransit",
  "readyForSale",
  "reserved",
  "sold",
] as const satisfies readonly (keyof InventorySummary)[];

const summaryVisuals = {
  total: { icon: CarIcon, tone: "neutral" },
  inTransit: { icon: TruckIcon, tone: "info" },
  readyForSale: { icon: BadgeCheckIcon, tone: "success" },
  reserved: { icon: CalendarCheckIcon, tone: "warning" },
  sold: { icon: HandCoinsIcon, tone: "violet" },
} satisfies Record<(typeof summaryKeys)[number], { icon: typeof CarIcon; tone: KpiTone }>;

export function VehicleSummary({ summary }: { summary?: InventorySummary }) {
  const t = useTranslations();
  const locale = useAppLocale();

  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      aria-label={t("inventory.summary.total")}
    >
      {summaryKeys.map((key) =>
        summary ? (
          <KpiCard
            key={key}
            label={t(`inventory.summary.${key}`)}
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
