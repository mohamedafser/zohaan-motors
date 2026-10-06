"use client";

import { useTranslations } from "next-intl";

import { useAppLocale } from "@/components/inventory/inventory-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResponsiveTable } from "@/components/tables/responsive-table";
import type { SampleVehicle } from "@/lib/mock/dashboard";
import { formatCurrency } from "@/lib/utils/currency";

export function DashboardRecentVehicles({ vehicles }: { vehicles: SampleVehicle[] }) {
  const t = useTranslations();
  const locale = useAppLocale();

  return (
    <ResponsiveTable
      bare
      rows={vehicles}
      columns={[
        {
          key: "stock",
          header: t("dashboard.columns.stock"),
          cell: (row) => <span className="font-medium tabular-nums">{row.stockNumber}</span>,
          className: "ps-5",
        },
        { key: "vehicle", header: t("dashboard.columns.vehicle"), cell: (row) => row.title },
        {
          key: "price",
          header: t("dashboard.columns.price"),
          cell: (row) => formatCurrency(row.priceAed, locale),
          className: "text-end tabular-nums",
        },
        {
          key: "status",
          header: t("dashboard.columns.status"),
          cell: (row) => (
            <StatusBadge status={row.status} label={t(`dashboard.status.${row.status}`)} />
          ),
        },
        {
          key: "branch",
          header: t("dashboard.columns.branch"),
          cell: (row) => <span className="text-muted-foreground">{row.branch}</span>,
          className: "pe-5",
        },
      ]}
      renderCard={(row) => (
        <article key={row.id} className="rounded-xl border p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-muted-foreground text-xs">{row.stockNumber}</p>
            </div>
            <StatusBadge status={row.status} label={t(`dashboard.status.${row.status}`)} />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-medium tabular-nums">{formatCurrency(row.priceAed, locale)}</span>
            <span className="text-muted-foreground text-xs">{row.branch}</span>
          </div>
        </article>
      )}
    />
  );
}
