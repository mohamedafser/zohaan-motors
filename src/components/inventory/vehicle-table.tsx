"use client";

import { ImageIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useAppLocale, vehicleTitle } from "@/components/inventory/inventory-utils";
import { VehicleCard } from "@/components/inventory/vehicle-card";
import { VehicleStatusBadge } from "@/components/inventory/vehicle-status-badge";
import { ResponsiveTable, type TableColumn } from "@/components/tables/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-permission";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/utils/currency";
import type { VehicleListItem } from "@/types/vehicle";

/** Cards below `md`, table from `md` up (via ResponsiveTable). */
export function VehicleTable({ vehicles }: { vehicles: VehicleListItem[] }) {
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
          <Link href={`/inventory/${row.id}`} className="font-medium underline-offset-4 hover:underline">
            {row.stockNumber}
          </Link>
        ),
      },
      {
        key: "vehicle",
        header: t("inventory.table.vehicle"),
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-lg border">
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
        <Link
          href={`/inventory/${row.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {t("inventory.table.view")}
        </Link>
      ),
    });

    return base;
  }, [t, locale, showPrice]);

  return (
    <ResponsiveTable
      columns={columns}
      rows={vehicles}
      renderCard={(vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />}
    />
  );
}
