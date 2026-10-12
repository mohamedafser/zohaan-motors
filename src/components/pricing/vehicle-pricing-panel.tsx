"use client";

import { useTranslations } from "next-intl";

import { PricingForm } from "@/components/pricing/pricing-form";
import { PricingStatusBadge } from "@/components/pricing/pricing-status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/use-permission";
import { usePricingMutations, useVehiclePricing } from "@/hooks/use-pricing";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { toast } from "sonner";

function Money({ value, locale }: { value: number | null | undefined; locale: "en" | "ar" }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span>{formatCurrency(value, locale)}</span>;
}

export function VehiclePricingPanel({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const { can } = usePermission();
  const canView =
    can("pricing.view") || can("vehicle.price.view") || can("vehicle.profit.view");
  const canEdit =
    can("pricing.update") || can("pricing.create") || can("vehicle.price.edit");
  const canApprove = can("pricing.approve") || can("pricing.discount.approve");
  const canCost = can("vehicle.cost.view") || can("pricing.view");
  const canProfit = can("vehicle.profit.view") || can("pricing.view");

  const query = useVehiclePricing(vehicleId, canView);
  const { approve } = usePricingMutations(vehicleId);

  if (!canView) {
    return (
      <EmptyState
        title={t("pricing.restricted.title")}
        description={t("pricing.restricted.description")}
      />
    );
  }

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title={t("pricing.empty.loadFailed")}
        description={t("pricing.empty.loadFailedHint")}
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const detail = query.data;
  const p = detail.profitability;
  const breakdown = detail.breakdown;
  const purchaseCost = breakdown?.purchaseCost ?? p.purchaseCost;
  const acquisitionExpenses = breakdown?.acquisitionExpenses ?? p.acquisitionExpenses;
  const otherCosts = breakdown?.otherCosts ?? p.otherVehicleCosts;
  const totalVehicleCost = breakdown?.totalVehicleCost ?? p.totalVehicleCost;
  const acquisitionLines = breakdown?.acquisitionLines ?? [];
  const awaitingApproval =
    p.pricingStatus === "pending_approval" ||
    p.pricingStatus === "discount_approval_required" ||
    p.pricingStatus === "below_minimum";

  function expenseLabel(category: string) {
    const key = `acquisitions.expenseTypes.${category}`;
    return t.has(key) ? t(key) : category;
  }

  async function onApprove(approveFlag: boolean) {
    try {
      await approve.mutateAsync({ approve: approveFlag, note: null });
      toast.success(
        approveFlag ? t("pricing.toasts.approved") : t("pricing.toasts.rejected"),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("pricing.toasts.error"));
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{t("pricing.panel.title")}</h2>
          {p.pricingStatus ? <PricingStatusBadge status={p.pricingStatus} /> : null}
        </div>
      </div>

      {p.belowMinimum ? (
        <Alert variant="destructive">
          <AlertTitle>{t("pricing.warnings.belowMinimumTitle")}</AlertTitle>
          <AlertDescription>{t("pricing.warnings.belowMinimumBody")}</AlertDescription>
        </Alert>
      ) : null}

      {p.isLoss ? (
        <Alert>
          <AlertTitle>{t("pricing.warnings.lossTitle")}</AlertTitle>
          <AlertDescription>{t("pricing.warnings.lossBody")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {canCost ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("pricing.sections.costBreakdown")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("pricing.cost.purchase")}</dt>
                  <dd><Money value={purchaseCost} locale={locale} /></dd>
                </div>
                {acquisitionLines.length > 0 ? (
                  acquisitionLines.map((line) => (
                    <div key={line.category} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{expenseLabel(line.category)}</dt>
                      <dd><Money value={line.amount} locale={locale} /></dd>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{t("pricing.cost.acquisitionExpenses")}</dt>
                    <dd><Money value={acquisitionExpenses} locale={locale} /></dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("pricing.cost.other")}</dt>
                  <dd><Money value={otherCosts} locale={locale} /></dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-border/60 pt-2 font-medium">
                  <dt>{t("pricing.summary.totalCost")}</dt>
                  <dd><Money value={totalVehicleCost} locale={locale} /></dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("pricing.sections.profitability")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("pricing.fields.minimum")}</dt>
                <dd><Money value={p.minimumSellingPrice} locale={locale} /></dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("pricing.fields.target")}</dt>
                <dd><Money value={p.targetSellingPrice} locale={locale} /></dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("pricing.summary.maxDiscount")}</dt>
                <dd>
                  <Money value={p.maximumDiscountAmount} locale={locale} />
                  {p.maximumDiscountPercent != null ? ` (${p.maximumDiscountPercent.toFixed(2)}%)` : null}
                </dd>
              </div>
              {canProfit ? (
                <>
                  <div className="flex justify-between gap-2 border-t border-border/60 pt-2">
                    <dt className="text-muted-foreground">{t("pricing.summary.expectedProfit")}</dt>
                    <dd className="font-medium">
                      <Money value={p.expectedGrossProfit} locale={locale} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{t("pricing.summary.margin")}</dt>
                    <dd className="font-medium">
                      {p.expectedMarginPercent == null
                        ? "—"
                        : `${p.expectedMarginPercent.toFixed(2)}%`}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </div>

      {awaitingApproval && canApprove ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("pricing.sections.approval")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => void onApprove(true)} disabled={approve.isPending}>
              {t("pricing.actions.approve")}
            </Button>
            <Button
              variant="outline"
              onClick={() => void onApprove(false)}
              disabled={approve.isPending}
            >
              {t("pricing.actions.reject")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("pricing.sections.edit")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PricingForm detail={detail} />
          </CardContent>
        </Card>
      ) : null}

      {(can("pricing.history.view") || can("pricing.view")) && detail.history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("pricing.sections.history")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {detail.history.slice(0, 8).map((item) => (
              <div key={item.id} className="grid gap-1 border-b border-border/50 pb-3 text-sm last:border-0">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {item.changedByName ?? t("pricing.history.unknownUser")}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(item.changedAt, locale, "dateTime")}
                  </span>
                </div>
                {item.previousMinimumPrice !== item.newMinimumPrice ? (
                  <p>
                    <span className="text-muted-foreground">{t("pricing.fields.minimum")}: </span>
                    <Money value={item.previousMinimumPrice} locale={locale} />
                    {" → "}
                    <Money value={item.newMinimumPrice} locale={locale} />
                  </p>
                ) : null}
                {item.previousTargetPrice !== item.newTargetPrice ? (
                  <p>
                    <span className="text-muted-foreground">{t("pricing.fields.target")}: </span>
                    <Money value={item.previousTargetPrice} locale={locale} />
                    {" → "}
                    <Money value={item.newTargetPrice} locale={locale} />
                  </p>
                ) : null}
                {item.reason ? (
                  <p className="text-muted-foreground">{t(`pricing.reasons.${item.reason}`)}</p>
                ) : null}
                {item.notes ? <p className="text-muted-foreground">{item.notes}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
