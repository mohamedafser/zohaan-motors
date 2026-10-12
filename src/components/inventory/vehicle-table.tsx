"use client";

import { GaugeIcon, ImageIcon, PencilIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BookVehicleButton } from "@/components/inventory/book-vehicle-button";
import { useAppLocale, vehicleTitle } from "@/components/inventory/inventory-utils";
import { MarketTypeBadge } from "@/components/inventory/market-type-badge";
import { QuantityBadge } from "@/components/inventory/quantity-badge";
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
    // Only what staff scan for in a list; everything else is one click away on the vehicle page.
    const base: TableColumn<VehicleListItem>[] = [
      {
        key: "vehicle",
        header: t("inventory.table.vehicle"),
        className: "ps-4",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-muted relative h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10">
              {row.primaryPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                <img
                  src={row.primaryPhotoUrl}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="bg-carbon text-sidebar-foreground/40 flex size-full items-center justify-center">
                  <ImageIcon className="size-4" aria-hidden />
                </div>
              )}
            </div>
            <div className="grid min-w-0 gap-1">
              <p className="truncate font-semibold">{vehicleTitle(row)}</p>
              <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="font-mono">{row.stockNumber}</span>
                <MarketTypeBadge value={row.marketType} className="h-5 px-1.5 text-[11px]" />
                <QuantityBadge quantity={row.quantity} className="h-5 px-1.5 text-[11px]" />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "mileage",
        header: t("inventory.table.mileage"),
        className: "hidden whitespace-nowrap tabular-nums lg:table-cell",
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <GaugeIcon className="text-muted-foreground size-3.5" aria-hidden />
            {formatNumber(row.mileage, locale)} {t(`inventory.enums.mileageUnit.${row.mileageUnit}`)}
          </span>
        ),
      },
      {
        key: "branch",
        header: t("inventory.table.location"),
        className: "hidden xl:table-cell",
        cell: (row) => (
          <div className="grid min-w-36 gap-0.5">
            <span>{row.branchName ?? "—"}</span>
            {row.locationName ? (
              <span className="text-muted-foreground text-xs">{row.locationName}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: "status",
        header: t("inventory.table.status"),
        cell: (row) => <VehicleStatusTrigger vehicle={row} variant="badge" />,
      },
    ];

    if (showPrice) {
      base.push({
        key: "price",
        header: t("inventory.table.price"),
        className: "whitespace-nowrap text-end",
        cell: (row) => <VehiclePrice vehicle={row} amountClassName="font-semibold" />,
      });
    }

    base.push({
      key: "actions",
      header: <span className="sr-only">{t("inventory.table.actions")}</span>,
      className: "pe-4 text-end",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" data-row-stop>
          <BookVehicleButton vehicle={row} variant="ghost" compact />
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
