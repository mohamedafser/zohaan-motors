"use client";

import {
  BanknoteIcon,
  CalendarCheckIcon,
  CarFrontIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  HandCoinsIcon,
  PlusIcon,
  ShipIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { KpiCard } from "@/components/cards/kpi-card";
import { HorizontalBars, OutcomeDonut, SalesBars, StockPipeline } from "@/components/dashboard/dashboard-charts";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppLocale } from "@/config/app";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { bookingHref } from "@/lib/bookings/routes";
import type { DashboardData } from "@/lib/dashboard/service";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

const AGE_BARS = {
  fresh: "bg-emerald-500",
  mid: "bg-gold",
  aging: "bg-orange-500",
  old: "bg-rose-500",
} as const;

export function DashboardClient({
  data,
  userName,
  canCreateBooking,
}: {
  data: DashboardData;
  userName: string;
  canCreateBooking: boolean;
}) {
  const t = useTranslations("dashboard");
  const tRoot = useTranslations();
  const locale = useLocale() as AppLocale;
  const timeZone = useViewerTimeZone();
  const money = (value: number) => formatCurrency(value, locale, data.currency);
  const compactMoney = (value: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      style: "currency",
      currency: data.currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  const monthLabel = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    if (!y || !m) return "";
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, 15)));
  };

  const { stock, month, bookings, outcomes } = data;
  const change =
    month.previousRevenue > 0 ? (month.revenue - month.previousRevenue) / month.previousRevenue : null;
  const closed = outcomes.sold + outcomes.cancelled;
  const conversion = closed > 0 ? Math.round((outcomes.sold / closed) * 100) : null;
  const firstName = userName.split(" ")[0] || userName;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("greeting", { name: firstName })}
        description={data.ownOnly ? t("descriptionOwn") : t("description")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/inventory" />}>
              <CarFrontIcon />
              {tRoot("nav.inventory")}
            </Button>
            {canCreateBooking ? (
              <Button variant="brand" nativeButton={false} render={<Link href="/bookings?new=1" />}>
                <PlusIcon />
                {tRoot("bookings.new")}
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Headline numbers */}
      <div className="stagger grid grid-cols-2 gap-3 [--stagger:60ms] xl:grid-cols-4">
        <KpiCard
          label={t("kpis.readyForSale")}
          value={formatNumber(stock.readyForSale, locale)}
          icon={CarFrontIcon}
          tone="success"
          hint={t("kpis.readyHint", { transit: stock.inTransit, booked: stock.booked })}
        />
        <KpiCard
          label={data.ownOnly ? t("kpis.mySoldThisMonth") : t("kpis.soldThisMonth")}
          value={compactMoney(month.revenue)}
          icon={change != null && change < 0 ? TrendingDownIcon : TrendingUpIcon}
          tone="brand"
          hint={
            change == null
              ? t("kpis.soldUnits", { count: month.soldUnits })
              : t("kpis.soldChange", {
                  count: month.soldUnits,
                  change: `${change >= 0 ? "+" : ""}${Math.round(change * 100)}%`,
                })
          }
        />
        <KpiCard
          label={t("kpis.activeBookings")}
          value={formatNumber(bookings.active, locale)}
          icon={CalendarCheckIcon}
          tone="info"
          hint={t("kpis.activeValue", { value: compactMoney(bookings.activeValue) })}
        />
        <KpiCard
          label={t("kpis.toCollect")}
          value={compactMoney(bookings.toCollect)}
          icon={BanknoteIcon}
          tone={bookings.balanceOverdue > 0 ? "danger" : bookings.awaitingDeposit > 0 ? "warning" : "neutral"}
          hint={
            bookings.balanceOverdue > 0
              ? t("kpis.overdueCount", { count: bookings.balanceOverdue })
              : t("kpis.awaitingDeposit", { count: bookings.awaitingDeposit })
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="grid content-start gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{data.ownOnly ? t("sales.titleOwn") : t("sales.title")}</CardTitle>
              <CardDescription>{t("sales.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesBars
                points={data.salesByMonth}
                formatValue={money}
                formatMonth={monthLabel}
                unitsLabel={(count) => t("sales.units", { count })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
                {t("attention.title")}
              </CardTitle>
              <CardDescription>{t("attention.description")}</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/bookings" />}>
                  {t("viewAll")}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {data.attention.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
                  {t("attention.empty")}
                </p>
              ) : (
                <ul className="grid gap-2">
                  {data.attention.map((item) => (
                    <li key={`${item.kind}-${item.number}`}>
                      <Link
                        href={bookingHref(item.number)}
                        className="group hover:border-foreground/20 hover:bg-muted/40 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors"
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg",
                            item.kind === "balance_overdue"
                              ? "bg-destructive/12 text-destructive"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {item.kind === "deposit_due" ? (
                            <HandCoinsIcon className="size-4" />
                          ) : (
                            <BanknoteIcon className="size-4" />
                          )}
                        </span>
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="truncate text-sm font-medium">{item.vehicle}</span>
                            <span className="text-muted-foreground font-mono text-[11px]">{item.number}</span>
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {t(`attention.${item.kind}`, {
                              date: formatDate(item.at, locale, "dateTimeZone", timeZone),
                            })}
                            {" · "}
                            {item.customer}
                            {item.salesperson && !data.ownOnly ? ` · ${item.salesperson}` : ""}
                          </span>
                        </span>
                        {item.amount != null ? (
                          <span
                            className={cn(
                              "hidden shrink-0 text-sm font-semibold tabular-nums sm:block",
                              item.kind === "balance_overdue" ? "text-destructive" : "text-amber-700 dark:text-amber-400",
                            )}
                          >
                            {money(item.amount)}
                          </span>
                        ) : null}
                        <ChevronRightIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("recent.title")}</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/bookings?filter=all" />}>
                  {t("viewAll")}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {data.recent.length === 0 ? (
                <EmptyState icon={CalendarCheckIcon} title={t("recent.empty")} className="py-10" />
              ) : (
                <ul className="divide-y">
                  {data.recent.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={bookingHref(b.number)}
                        className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                      >
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-sm font-medium">{b.vehicle?.title ?? "—"}</span>
                          <span className="text-muted-foreground truncate text-xs">
                            <span className="font-mono">{b.number}</span> · {b.customer?.name ?? "—"} ·{" "}
                            {formatDate(b.reservedAt, locale, "short", timeZone)}
                          </span>
                        </span>
                        <span className="hidden text-sm font-medium tabular-nums sm:block">
                          {b.totalPrice == null ? "—" : money(b.totalPrice)}
                        </span>
                        <StatusBadge status={`booking_${b.status}`} label={tRoot(`bookings.statuses.${b.status}`)} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("stock.title")}</CardTitle>
              <CardDescription>
                {t("stock.askingValue", { value: compactMoney(stock.askingValue) })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockPipeline
                parts={[
                  { key: "inTransit", label: tRoot("inventory.status.acquired"), units: stock.inTransit, href: "/inventory?status=acquired" },
                  { key: "readyForSale", label: tRoot("inventory.status.ready_for_sale"), units: stock.readyForSale, href: "/inventory?status=ready_for_sale" },
                  { key: "booked", label: tRoot("inventory.status.reserved"), units: stock.booked, href: "/inventory?status=reserved" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("outcomes.title")}</CardTitle>
              <CardDescription>{t("outcomes.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <OutcomeDonut
                centerValue={conversion == null ? "—" : `${conversion}%`}
                centerLabel={t("outcomes.conversion")}
                parts={[
                  { key: "sold", label: t("outcomes.sold"), value: outcomes.sold },
                  { key: "active", label: t("outcomes.active"), value: outcomes.active },
                  { key: "cancelled", label: t("outcomes.cancelled"), value: outcomes.cancelled },
                ]}
              />
            </CardContent>
          </Card>

          {data.leaders ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("leaders.title")}</CardTitle>
                <CardDescription>{t("leaders.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.leaders.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("leaders.empty")}</p>
                ) : (
                  <HorizontalBars
                    rows={data.leaders.map((l) => ({
                      key: l.id,
                      label: l.name,
                      value: l.revenue,
                      display: compactMoney(l.revenue),
                      detail: t("leaders.detail", { sold: l.units, active: l.active }),
                      barClassName: "bg-gold",
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShipIcon className="text-muted-foreground size-4" />
                {t("age.title")}
              </CardTitle>
              <CardDescription>{t("age.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBars
                rows={stock.age.map((band) => ({
                  key: band.key,
                  label: t(`agingBands.${band.key}`),
                  value: band.units,
                  display: t("age.units", { count: band.units }),
                  barClassName: AGE_BARS[band.key],
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
