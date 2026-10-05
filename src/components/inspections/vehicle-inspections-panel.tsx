"use client";

import { ClipboardCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { InspectionResultBadge } from "@/components/inspections/inspection-result-badge";
import { InspectionStatusBadge } from "@/components/inspections/inspection-status-badge";
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
      <EmptyState
        icon={ClipboardCheckIcon}
        title={t("inventory.tabEmpty.inspection.title")}
        description={t("inventory.tabEmpty.inspection.description")}
        action={
          <PermissionGate permission="inspection.create">
            <Link
              href={`/inspections/new?vehicleId=${vehicleId}`}
              className={cn(buttonVariants())}
            >
              {t("inspections.actions.add")}
            </Link>
          </PermissionGate>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      {latest ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">{t("inspections.detail.latest")}</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                {latest.inspectionNumber}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <InspectionStatusBadge status={latest.status} />
              <InspectionResultBadge result={latest.result} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-muted-foreground text-sm">
              {latest.overallScore != null ? (
                <span className="me-3 tabular-nums">{latest.overallScore}%</span>
              ) : null}
              {latest.criticalFindingsCount > 0 ? (
                <span className="text-rose-700 dark:text-rose-300 me-3">
                  {t("inspections.progress.critical", {
                    count: latest.criticalFindingsCount,
                  })}
                </span>
              ) : null}
              <span className="tabular-nums">
                {formatDate(latest.submittedAt ?? latest.createdAt, locale, "medium")}
              </span>
            </div>
            <Link
              href={`/inspections/${latest.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("inspections.table.view")}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("inspections.detail.historyList")}</h3>
        <PermissionGate permission="inspection.create">
          <Link
            href={`/inspections/new?vehicleId=${vehicleId}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            {t("inspections.actions.add")}
          </Link>
        </PermissionGate>
      </div>

      <ul className="grid gap-2">
        {inspections.map((inspection) => (
          <li key={inspection.id}>
            <Link
              href={`/inspections/${inspection.id}`}
              className="hover:bg-muted/40 focus-visible:ring-ring/50 flex items-center justify-between gap-3 rounded-xl border p-3 outline-none focus-visible:ring-3"
            >
              <div className="min-w-0">
                <p className="font-medium tabular-nums">{inspection.inspectionNumber}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatDate(inspection.submittedAt ?? inspection.createdAt, locale, "medium")}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <InspectionStatusBadge status={inspection.status} />
                <InspectionResultBadge result={inspection.result} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
