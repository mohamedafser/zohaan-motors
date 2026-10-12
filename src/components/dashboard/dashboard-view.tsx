import {
  BadgeCheckIcon,
  CalendarClockIcon,
  CarIcon,
  ChevronRightIcon,
  CalendarCheckIcon,
  TagIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ChartPlaceholder } from "@/components/cards/chart-placeholder";
import { KpiCard } from "@/components/cards/kpi-card";
import { DashboardRecentVehicles } from "@/components/dashboard/dashboard-recent-vehicles";
import { SampleNotice } from "@/components/feedback/sample-notice";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig, isAppLocale, type AppLocale } from "@/config/app";
import { Link } from "@/lib/i18n/navigation";
import { dashboardSample } from "@/lib/mock/dashboard";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/currency";

const mixColors = {
  available: "bg-chart-3",
  reserved: "bg-chart-1",
  sold: "bg-chart-5",
} as const;

const agingColors = ["bg-chart-3", "bg-chart-1", "bg-chart-4", "bg-destructive"];

const actionIcons: Record<string, typeof TagIcon> = {
  "/bookings": CalendarCheckIcon,
};

export async function DashboardView() {
  const t = await getTranslations();
  const localeValue = await getLocale();
  const locale: AppLocale = isAppLocale(localeValue) ? localeValue : appConfig.defaultLocale;
  const maxAging = Math.max(...dashboardSample.aging.map((band) => band.count));
  const mixTotal = dashboardSample.inventoryMix.reduce((sum, item) => sum + item.value, 0);
  const series = dashboardSample.salesSeries;
  const latest = series.at(-1) ?? 0;
  const previous = series.at(-2) ?? latest;
  const change = previous ? (latest - previous) / previous : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/inventory" />}>
            <CarIcon />
            {t("nav.inventory")}
          </Button>
        }
      />
      <SampleNotice title={t("common.sample")} description={t("dashboard.sample")} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          label={t("dashboard.kpis.stock")}
          value={formatNumber(dashboardSample.kpis.stock, locale)}
          icon={CarIcon}
        />
        <KpiCard
          label={t("dashboard.kpis.available")}
          value={formatNumber(dashboardSample.kpis.available, locale)}
          icon={BadgeCheckIcon}
          tone="success"
        />
        <KpiCard
          label={t("dashboard.kpis.reserved")}
          value={formatNumber(dashboardSample.kpis.reserved, locale)}
          icon={CalendarClockIcon}
          tone="warning"
        />
        <KpiCard
          label={t("dashboard.kpis.sales")}
          value={formatCurrency(dashboardSample.kpis.monthSalesAed, locale)}
          icon={WalletIcon}
          tone="brand"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartPlaceholder
            title={t("dashboard.salesChart")}
            values={series}
            caption={t("dashboard.chartCaption")}
            summary={
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-foreground text-xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(latest, locale)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-700 tabular-nums dark:bg-emerald-400/12 dark:text-emerald-300">
                  <TrendingUpIcon className="size-3.5" aria-hidden />
                  {formatPercent(change, locale, { signed: true })}
                </span>
              </span>
            }
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.inventoryChart")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex h-3 gap-1 overflow-hidden rounded-full" aria-hidden>
              {dashboardSample.inventoryMix.map((item) => (
                <div
                  key={item.key}
                  className={`${mixColors[item.key]} h-full rounded-full`}
                  style={{ width: `${(item.value / mixTotal) * 100}%` }}
                />
              ))}
            </div>
            <ul className="grid gap-3">
              {dashboardSample.inventoryMix.map((item) => (
                <li key={item.key} className="flex items-center gap-3 text-sm">
                  <span className={`${mixColors[item.key]} size-2.5 rounded-full`} aria-hidden />
                  <span className="flex-1">{t(`dashboard.status.${item.key}`)}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatPercent(item.value / mixTotal, locale)}
                  </span>
                  <span className="w-8 text-end font-medium tabular-nums">
                    {formatNumber(item.value, locale)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">{t("dashboard.chartCaption")}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.aging")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {dashboardSample.aging.map((band, index) => (
              <div key={band.key} className="grid gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{t(`dashboard.agingBands.${band.key}`)}</span>
                  <span className="font-medium tabular-nums">{formatNumber(band.count, locale)}</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className={`${agingColors[index] ?? "bg-brand"} h-full rounded-full`}
                    style={{ width: `${(band.count / maxAging) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-muted-foreground text-xs">{t("dashboard.agingCaption")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.pending")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {dashboardSample.actions.map((action) => {
              const Icon = actionIcons[action.href] ?? TagIcon;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className="group hover:bg-muted/60 hover:border-brand/30 focus-visible:ring-ring flex items-center gap-3 rounded-xl border px-3 py-3 text-sm outline-none transition-colors focus-visible:ring-2"
                >
                  <span className="bg-brand-soft text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1 font-medium">
                    {t(action.labelKey as Parameters<typeof t>[0])}
                  </span>
                  <ChevronRightIcon
                    className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.recentVehicles")}</CardTitle>
          <CardAction>
            <ViewAll href="/inventory" label={t("dashboard.viewAll")} />
          </CardAction>
        </CardHeader>
        <CardContent className="max-md:px-(--card-spacing) md:px-0">
          <DashboardRecentVehicles vehicles={dashboardSample.vehicles} />
        </CardContent>
      </Card>

    </div>
  );
}

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={href} />}>
      {label}
      <ChevronRightIcon data-icon="inline-end" className="rtl:rotate-180" />
    </Button>
  );
}

