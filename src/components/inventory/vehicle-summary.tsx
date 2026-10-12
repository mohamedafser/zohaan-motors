"use client";

import { BadgeCheckIcon, CalendarCheckIcon, CarIcon, HandCoinsIcon, TruckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { KpiCard, type KpiTone } from "@/components/cards/kpi-card";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/lib/utils/currency";
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
    <div className="grid gap-3">
      <section
        className="stagger grid grid-cols-2 gap-3 [--stagger:70ms] md:grid-cols-3 xl:grid-cols-5"
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
      {summary && summary.total > 0 ? <StockPipeline summary={summary} /> : null}
    </div>
  );
}

const pipelineSegments = [
  { key: "inTransit", color: "bg-sky-500" },
  { key: "readyForSale", color: "bg-emerald-500" },
  { key: "reserved", color: "bg-amber-500" },
  { key: "sold", color: "bg-violet-500" },
] as const;

/** Where the units are, as one segmented bar, plus how much of the stock has sold. */
function StockPipeline({ summary }: { summary: InventorySummary }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const share = (value: number) => (summary.total ? value / summary.total : 0);
  const sellThrough = share(summary.sold);
  const r = 15.9155; // circumference 100

  return (
    <Card className="animate-rise grid gap-5 p-4 [animation-delay:350ms] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-heading font-semibold">{t("inventory.pipeline.title")}</p>
          <p className="text-muted-foreground text-xs">{t("inventory.pipeline.hint")}</p>
        </div>
        <div
          className="bg-muted flex h-4 gap-0.5 overflow-hidden rounded-full"
          role="img"
          aria-label={pipelineSegments
            .map((segment) => `${t(`inventory.summary.${segment.key}`)} ${summary[segment.key]}`)
            .join(", ")}
        >
          {pipelineSegments.map((segment, index) =>
            summary[segment.key] > 0 ? (
              <div
                key={segment.key}
                className={cn(
                  segment.color,
                  "animate-grow-x h-full first:rounded-s-full last:rounded-e-full ltr:origin-left rtl:origin-right",
                )}
                style={{
                  width: `${share(summary[segment.key]) * 100}%`,
                  animationDelay: `${450 + index * 120}ms`,
                }}
              />
            ) : null,
          )}
        </div>
        <ul className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          {pipelineSegments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2">
              <span className={cn(segment.color, "size-2.5 shrink-0 rounded-full")} aria-hidden />
              <span className="text-muted-foreground truncate">
                {t(`inventory.summary.${segment.key}`)}
              </span>
              <span className="ms-auto font-semibold tabular-nums">
                {formatNumber(summary[segment.key], locale)}
              </span>
              <span className="text-muted-foreground w-10 text-end text-xs tabular-nums">
                {formatPercent(share(summary[segment.key]), locale)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-3 sm:border-s sm:ps-5">
        <div className="relative size-16 shrink-0">
          <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r={r} fill="none" className="stroke-muted" strokeWidth="3.5" />
            <circle
              cx="18"
              cy="18"
              r={r}
              fill="none"
              pathLength={1}
              strokeDasharray={`${Math.max(sellThrough, 0.01)} 1`}
              strokeWidth="3.5"
              strokeLinecap="round"
              className="animate-draw stroke-violet-500"
              style={{ animationDelay: "600ms" }}
            />
          </svg>
          <span className="absolute inset-0 grid place-content-center text-xs font-semibold tabular-nums">
            {formatPercent(sellThrough, locale)}
          </span>
        </div>
        <div className="grid gap-0.5">
          <span className="text-sm font-semibold">{t("inventory.pipeline.sellThrough")}</span>
          <span className="text-muted-foreground text-xs">
            {t("inventory.pipeline.available")}:{" "}
            <span className="text-foreground font-medium tabular-nums">
              {formatNumber(summary.readyForSale, locale)}
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
}
