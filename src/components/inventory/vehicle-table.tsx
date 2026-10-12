"use client";

import { ImageIcon, PencilIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BookVehicleButton } from "@/components/inventory/book-vehicle-button";
import { useAppLocale, vehicleTitle } from "@/components/inventory/inventory-utils";
import { MarketTypeBadge } from "@/components/inventory/market-type-badge";
import { VehicleCard } from "@/components/inventory/vehicle-card";
import { VehiclePrice } from "@/components/inventory/vehicle-price";
import { VehicleStatusTrigger } from "@/components/inventory/vehicle-status-trigger";
import { ResponsiveTable, type TableColumn } from "@/components/tables/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-permission";
import type { ListViewMode } from "@/hooks/use-list-view-mode";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/currency";
import type { VehicleListItem } from "@/types/vehicle";
import { vehicleHref } from "@/lib/vehicles/routes";

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
        key: "quantity",
        header: t("inventory.table.quantity"),
        className: "tabular-nums text-end",
        cell: (row) => formatNumber(row.quantity, locale),
      },
      {
        key: "status",
        header: t("inventory.table.status"),
        cell: (row) => <VehicleStatusTrigger vehicle={row} variant="badge" />,
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
        cell: (row) => <VehiclePrice vehicle={row} />,
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
              href={vehicleHref(row.stockNumber, "/edit")}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              aria-label={t("inventory.actions.edit")}
              onClick={(event) => event.stopPropagation()}
            >
              <PencilIcon className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t("inventory.actions.edit")}</span>
            </Link>
          ) : null}
          <BookVehicleButton vehicle={row} variant="ghost" compact />
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
      hrefForRow={(vehicle) => vehicleHref(vehicle.stockNumber)}
      renderCard={(vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />}
    />
  );
}
