import { getLocale, getTranslations } from "next-intl/server";

import { ChartPlaceholder } from "@/components/cards/chart-placeholder";
import { KpiCard } from "@/components/cards/kpi-card";
import { SampleNotice } from "@/components/feedback/sample-notice";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResponsiveTable } from "@/components/tables/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig, isAppLocale, type AppLocale } from "@/config/app";
import { Link } from "@/lib/i18n/navigation";
import { dashboardSample } from "@/lib/mock/dashboard";
import { formatCurrency, formatNumber } from "@/lib/utils/currency";
import { formatRelativeTime } from "@/lib/utils/date";

export async function DashboardView() {
  const t = await getTranslations();
  const localeValue = await getLocale();
  const locale: AppLocale = isAppLocale(localeValue) ? localeValue : appConfig.defaultLocale;
  const maxAging = Math.max(...dashboardSample.aging.map((band) => band.count));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} />
      <SampleNotice title={t("common.sample")} description={t("dashboard.sample")} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("dashboard.kpis.stock")} value={formatNumber(dashboardSample.kpis.stock, locale)} />
        <KpiCard
          label={t("dashboard.kpis.available")}
          value={formatNumber(dashboardSample.kpis.available, locale)}
        />
        <KpiCard
          label={t("dashboard.kpis.reserved")}
          value={formatNumber(dashboardSample.kpis.reserved, locale)}
        />
        <KpiCard
          label={t("dashboard.kpis.sales")}
          value={formatCurrency(dashboardSample.kpis.monthSalesAed, locale)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartPlaceholder
            title={t("dashboard.salesChart")}
            values={dashboardSample.salesSeries}
            caption={t("dashboard.chartCaption")}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.inventoryChart")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboardSample.inventoryMix.map((item) => (
              <div key={item.key} className="grid gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{t(`dashboard.status.${item.key}`)}</span>
                  <span className="tabular-nums">{formatNumber(item.value, locale)}</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${(item.value / dashboardSample.kpis.stock) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-muted-foreground text-xs">{t("dashboard.chartCaption")}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.aging")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboardSample.aging.map((band) => (
              <div key={band.key} className="grid gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{t(`dashboard.agingBands.${band.key}`)}</span>
                  <span className="tabular-nums">{formatNumber(band.count, locale)}</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-brand h-full rounded-full"
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
            {dashboardSample.actions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="hover:bg-muted focus-visible:ring-ring flex items-center justify-between rounded-lg border px-3 py-3 text-sm outline-none focus-visible:ring-2"
              >
                <span>{t(action.labelKey as Parameters<typeof t>[0])}</span>
                <Badge variant="outline">{t("common.sample")}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.recentVehicles")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            rows={dashboardSample.vehicles}
            columns={[
              { key: "stock", header: t("dashboard.columns.stock"), cell: (row) => row.stockNumber },
              { key: "vehicle", header: t("dashboard.columns.vehicle"), cell: (row) => row.title },
              {
                key: "price",
                header: t("dashboard.columns.price"),
                cell: (row) => formatCurrency(row.priceAed, locale),
                className: "text-end",
              },
              {
                key: "status",
                header: t("dashboard.columns.status"),
                cell: (row) => (
                  <StatusBadge status={row.status} label={t(`dashboard.status.${row.status}`)} />
                ),
              },
              { key: "branch", header: t("dashboard.columns.branch"), cell: (row) => row.branch },
            ]}
            renderCard={(row) => (
              <article key={row.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-muted-foreground text-xs">{row.stockNumber}</p>
                  </div>
                  <StatusBadge status={row.status} label={t(`dashboard.status.${row.status}`)} />
                </div>
                <p className="mt-3 text-sm tabular-nums">{formatCurrency(row.priceAed, locale)}</p>
                <p className="text-muted-foreground text-xs">{row.branch}</p>
              </article>
            )}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentLeads")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboardSample.leads.map((lead) => (
              <article key={lead.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {lead.source} · {formatRelativeTime(lead.createdAt, locale)}
                  </p>
                </div>
                <StatusBadge status={lead.status} label={t(`dashboard.status.${lead.status}`)} />
              </article>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentSales")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboardSample.sales.map((sale) => (
              <article key={sale.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{sale.reference}</p>
                  <p className="text-muted-foreground text-xs">
                    {sale.customer} · {formatRelativeTime(sale.createdAt, locale)}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm tabular-nums">{formatCurrency(sale.amountAed, locale)}</p>
                  <StatusBadge status={sale.status} label={t(`dashboard.status.${sale.status}`)} />
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
