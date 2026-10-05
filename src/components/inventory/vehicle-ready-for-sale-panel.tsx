"use client";

import { CheckCircle2Icon, CircleAlertIcon, TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PermissionGate } from "@/components/auth/permission-gate";
import { VehicleReadyForSaleDialog } from "@/components/inventory/vehicle-ready-for-sale-dialog";
import { VehicleStatusBadge } from "@/components/inventory/vehicle-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/use-permission";
import { useReadyForSaleEligibility } from "@/hooks/use-vehicles";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { canMarkReadyForSaleFrom } from "@/lib/vehicles/status-transitions";
import type { ReadyForSaleAction, ReadyForSaleEligibility } from "@/types/ready-for-sale";
import type { VehicleDetail } from "@/types/vehicle";

function actionHref(
  action: ReadyForSaleAction,
  vehicleId: string,
  eligibility: ReadyForSaleEligibility,
): string | null {
  switch (action) {
    case "view_inspection":
      return eligibility.inspection?.id
        ? `/inspections/${eligibility.inspection.id}`
        : `/inventory/${vehicleId}?tab=inspection`;
    case "create_inspection":
      return `/inspections/new?vehicleId=${vehicleId}`;
    case "view_documents":
      return `/inventory/${vehicleId}?tab=documents`;
    default:
      return null;
  }
}

function actionLabel(
  action: ReadyForSaleAction,
  t: ReturnType<typeof useTranslations>,
): string | null {
  if (!action) return null;
  return t(`inventory.readyForSale.actions.${action}`);
}

function actionAllowed(
  action: ReadyForSaleAction,
  can: (permission: Parameters<ReturnType<typeof usePermission>["can"]>[0]) => boolean,
) {
  switch (action) {
    case "view_inspection":
      return can("inspection.view");
    case "create_inspection":
      return can("inspection.create");
    case "view_documents":
      return can("document.view") || can("vehicle.view");
    default:
      return false;
  }
}

const READY_CHECK_KEYS = new Set([
  "inspection_completed",
  "inspection_result",
  "critical_findings",
  "repairs",
  "documents",
  "status",
]);

const HIDDEN_CHECK_KEYS = new Set(["workshop", "quality_check"]);

function checkLabel(
  check: { key: string; label: string },
  t: ReturnType<typeof useTranslations>,
) {
  if (READY_CHECK_KEYS.has(check.key)) {
    return t(`inventory.readyForSale.checks.${check.key}`);
  }
  return check.label;
}

export function VehicleReadyForSalePanel({ vehicle }: { vehicle: VehicleDetail }) {
  const t = useTranslations();
  const { can } = usePermission();
  const [dialogOpen, setDialogOpen] = useState(false);
  const showPanel = can("vehicle.ready_for_sale") && canMarkReadyForSaleFrom(vehicle.status);

  const query = useReadyForSaleEligibility(vehicle.id, showPanel);

  if (!showPanel) {
    if (vehicle.status === "ready_for_sale") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("inventory.readyForSale.panelTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">{t("inventory.fields.status")}</span>
              <VehicleStatusBadge status={vehicle.status} />
            </div>
            <p className="text-muted-foreground text-sm">{t("inventory.readyForSale.alreadyReady")}</p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  if (query.isPending) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.readyForSale.panelTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-muted-foreground text-sm">{t("inventory.readyForSale.loadFailed")}</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const eligibility = query.data;
  const visibleChecks = eligibility.checks.filter((check) => !HIDDEN_CHECK_KEYS.has(check.key));
  const visibleBlockers = eligibility.blockers.filter(
    (blocker) =>
      !blocker.code.startsWith("workshop") &&
      blocker.code !== "quality_check_required" &&
      blocker.code !== "quality_check_failed" &&
      blocker.code !== "active_workshop" &&
      blocker.code !== "pending_workshop_jobs",
  );
  const uniqueActions = Array.from(
    new Map(
      visibleBlockers
        .filter((blocker) => blocker.action)
        .map((blocker) => [blocker.action, blocker] as const),
    ).values(),
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.readyForSale.panelTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">{t("inventory.fields.status")}</span>
            <VehicleStatusBadge status={vehicle.status} />
          </div>

          {eligibility.eligible ? (
            <div className="grid gap-3">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {t("inventory.readyForSale.eligibleTitle")}
              </p>
              <ul className="grid gap-2">
                {visibleChecks
                  .filter((check) => check.ok)
                  .map((check) => (
                    <li key={check.key} className="flex items-start gap-2 text-sm">
                      <CheckCircle2Icon
                        className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                        aria-hidden
                      />
                      <span>{checkLabel(check, t)}</span>
                    </li>
                  ))}
              </ul>
              <PermissionGate permission="vehicle.ready_for_sale">
                <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
                  <TagIcon aria-hidden />
                  {t("inventory.actions.markReadyForSale")}
                </Button>
              </PermissionGate>
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {t("inventory.readyForSale.blockedTitle")}
              </p>
              <ul className="grid gap-2">
                {visibleChecks.map((check) => (
                  <li key={check.key} className="flex items-start gap-2 text-sm">
                    {check.ok ? (
                      <CheckCircle2Icon
                        className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                        aria-hidden
                      />
                    ) : (
                      <CircleAlertIcon
                        className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
                        aria-hidden
                      />
                    )}
                    <span>{checkLabel(check, t)}</span>
                  </li>
                ))}
              </ul>

              {visibleBlockers.length > 0 ? (
                <div className="grid gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-sm font-medium">{t("inventory.readyForSale.outstanding")}</p>
                  <ul className="grid gap-1.5">
                    {visibleBlockers.map((blocker, index) => (
                      <li key={`${blocker.code}-${index}`} className="text-muted-foreground text-sm">
                        • {blocker.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {uniqueActions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {uniqueActions.map((blocker) => {
                    const href = actionHref(blocker.action, vehicle.id, eligibility);
                    const label = actionLabel(blocker.action, t);
                    if (!href || !label || !actionAllowed(blocker.action, can)) return null;
                    return (
                      <Link
                        key={blocker.action}
                        href={href}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {eligibility.canOverride ? (
                <PermissionGate permission="vehicle.ready_for_sale.override">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
                    {t("inventory.readyForSale.overrideOpen")}
                  </Button>
                </PermissionGate>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <VehicleReadyForSaleDialog
        vehicle={vehicle}
        eligibility={eligibility}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
