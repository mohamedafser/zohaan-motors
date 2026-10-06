"use client";

import { ClipboardCheckIcon, ImageIcon, PencilIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useAppLocale, vehicleTitle } from "@/components/inventory/inventory-utils";
import { MarketTypeBadge } from "@/components/inventory/market-type-badge";
import { VehicleCard } from "@/components/inventory/vehicle-card";
import { VehicleInspectionBadge } from "@/components/inventory/vehicle-inspection-badge";
import { VehicleStatusBadge } from "@/components/inventory/vehicle-status-badge";
import { ResponsiveTable, type TableColumn } from "@/components/tables/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-permission";
import type { ListViewMode } from "@/hooks/use-list-view-mode";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/utils/currency";
import type { VehicleListItem } from "@/types/vehicle";

export function VehicleTable({
  vehicles,
  viewMode = "auto",
}: {
  vehicles: VehicleListItem[];
  viewMode?: ListViewMode | "auto";
}) {
  const t = useTranslations();
  const locale = useAppLocale();
  const { can } = usePermission();
  const showPrice = can("vehicle.price.view");

  const columns = useMemo<TableColumn<VehicleListItem>[]>(() => {
    const base: TableColumn<VehicleListItem>[] = [
      {
        key: "stock",
        header: t("inventory.table.stockId"),
        className: "tabular-nums",
        cell: (row) => (
          <span className="font-medium">{row.stockNumber}</span>
        ),
      },
      {
        key: "vehicle",
        header: t("inventory.table.vehicle"),
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-muted relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border">
              {row.primaryPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                <img
                  src={row.primaryPhotoUrl}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="text-muted-foreground flex size-full items-center justify-center">
                  <ImageIcon className="size-4" aria-hidden />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{vehicleTitle(row)}</p>
              {row.vin ? (
                <p className="text-muted-foreground truncate font-mono text-xs">{row.vin}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: "brand",
        header: t("inventory.table.brand"),
        cell: (row) => row.make,
      },
      {
        key: "model",
        header: t("inventory.table.model"),
        cell: (row) => row.model,
      },
      {
        key: "marketType",
        header: t("inventory.table.marketType"),
        cell: (row) => <MarketTypeBadge value={row.marketType} />,
      },
      {
        key: "mileage",
        header: t("inventory.table.mileage"),
        className: "tabular-nums",
        cell: (row) =>
          `${formatNumber(row.mileage, locale)} ${t(`inventory.enums.mileageUnit.${row.mileageUnit}`)}`,
      },
      {
        key: "status",
        header: t("inventory.table.status"),
        cell: (row) => <VehicleStatusBadge status={row.status} />,
      },
      {
        key: "inspection",
        header: t("inventory.table.inspection"),
        cell: (row) => (
          <VehicleInspectionBadge value={row.inspection?.label ?? "not_inspected"} />
        ),
      },
      {
        key: "branch",
        header: t("inventory.table.branch"),
        cell: (row) => (
          <div>
            <p>{row.branchName ?? "—"}</p>
            {row.locationName ? (
              <p className="text-muted-foreground text-xs">{row.locationName}</p>
            ) : null}
          </div>
        ),
      },
    ];

    if (showPrice) {
      base.push({
        key: "price",
        header: t("inventory.table.price"),
        className: "tabular-nums text-end",
        cell: (row) =>
          row.currentSellingPrice != null ? formatCurrency(row.currentSellingPrice, locale) : "—",
      });
    }

    base.push({
      key: "actions",
      header: t("inventory.table.actions"),
      className: "text-end",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" data-row-stop>
          {can("vehicle.edit") ? (
            <Link
              href={`/inventory/${row.id}/edit`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              aria-label={t("inventory.actions.edit")}
              onClick={(event) => event.stopPropagation()}
            >
              <PencilIcon className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t("inventory.actions.edit")}</span>
            </Link>
          ) : null}
          {can("inspection.create") ? (
            <Link
              href={`/inspections/new?vehicleId=${row.id}`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              aria-label={t("inventory.inspectionCard.inspectVehicle")}
              onClick={(event) => event.stopPropagation()}
            >
              <ClipboardCheckIcon className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">
                {t("inventory.inspectionCard.inspectVehicle")}
              </span>
            </Link>
          ) : null}
        </div>
      ),
    });

    return base;
  }, [t, locale, showPrice, can]);

  return (
    <ResponsiveTable
      columns={columns}
      rows={vehicles}
      viewMode={viewMode}
      hrefForRow={(vehicle) => `/inventory/${vehicle.id}`}
      renderCard={(vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />}
    />
  );
}
