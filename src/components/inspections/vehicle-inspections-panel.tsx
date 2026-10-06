"use client";

import { AlertTriangleIcon, ClipboardCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { InspectionResultBadge } from "@/components/inspections/inspection-result-badge";
import { InspectionStatusBadge } from "@/components/inspections/inspection-status-badge";
import { VehicleInspectionBadge } from "@/components/inventory/vehicle-inspection-badge";
import { PermissionGate } from "@/components/auth/permission-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVehicleInspections } from "@/hooks/use-inspections";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";

export function VehicleInspectionsPanel({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const query = useVehicleInspections(vehicleId);

  if (query.isPending) {
    return (
      <div className="grid gap-3" aria-busy>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title={t("inspections.errors.loadTitle")}
        description={query.error.message}
        action={
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const inspections = query.data;
  const latest = inspections[0];

  if (inspections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.inspectionCard.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <VehicleInspectionBadge value="not_inspected" />
          <p className="text-muted-foreground text-sm">
            {t("inventory.inspectionCard.notInspectedHint")}
          </p>
          <PermissionGate permission="inspection.create">
            <Link
              href={`/inspections/new?vehicleId=${vehicleId}`}
              className={cn(buttonVariants({ className: "w-fit" }))}
            >
              {t("inventory.inspectionCard.inspectVehicle")}
            </Link>
          </PermissionGate>
        </CardContent>
      </Card>
    );
  }

  const failed = latest?.status === "approved" && latest.result === "fail";

  return (
    <div className="grid gap-4">
      {latest ? (
        <Card className={cn(failed && "border-destructive/50")}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">{t("inventory.inspectionCard.title")}</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                {latest.inspectionNumber}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <InspectionStatusBadge status={latest.status} />
              <InspectionResultBadge result={latest.result} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {failed ? (
              <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium">
                <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
                {t("inventory.inspectionCard.failedWarning")}
              </div>
            ) : null}
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs">{t("inventory.inspectionCard.date")}</dt>
                <dd className="font-medium tabular-nums">
                  {formatDate(
                    latest.inspectedAt ?? latest.submittedAt ?? latest.createdAt,
                    locale,
                    "medium",
                  )}
                </dd>
              </div>
              {latest.overallScore != null ? (
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t("inventory.inspectionCard.score")}
                  </dt>
                  <dd className="font-medium tabular-nums">{latest.overallScore}%</dd>
                </div>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/inspections/${latest.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {t("inventory.inspectionCard.viewInspection")}
              </Link>
              <PermissionGate permission="inspection.create">
                <Link
                  href={`/inspections/new?vehicleId=${vehicleId}`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  {t("inventory.inspectionCard.inspectVehicle")}
                </Link>
              </PermissionGate>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("inspections.detail.historyList")}</h3>
      </div>

      <ul className="grid gap-2">
        {inspections.map((item) => (
          <li key={item.id}>
            <Link
              href={`/inspections/${item.id}`}
              className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium tabular-nums">{item.inspectionNumber}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatDate(item.submittedAt ?? item.createdAt, locale, "medium")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <InspectionStatusBadge status={item.status} />
                <InspectionResultBadge result={item.result} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
