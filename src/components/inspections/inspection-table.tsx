"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { InspectionCard } from "@/components/inspections/inspection-card";
import { InspectionResultBadge } from "@/components/inspections/inspection-result-badge";
import { InspectionStatusBadge } from "@/components/inspections/inspection-status-badge";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { ResponsiveTable, type TableColumn } from "@/components/tables/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import type { InspectionListItem } from "@/types/inspection";

function vehicleLabel(item: InspectionListItem) {
  return [item.vehicleYear, item.vehicleMake, item.vehicleModel].filter(Boolean).join(" ") || "—";
}

export function InspectionTable({ inspections }: { inspections: InspectionListItem[] }) {
  const t = useTranslations();
  const locale = useAppLocale();

  const columns = useMemo<TableColumn<InspectionListItem>[]>(
    () => [
      {
        key: "number",
        header: t("inspections.table.number"),
        className: "tabular-nums",
        cell: (row) => (
          <Link
            href={`/inspections/${row.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {row.inspectionNumber}
          </Link>
        ),
      },
      {
        key: "vehicle",
        header: t("inspections.table.vehicle"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-medium">{vehicleLabel(row)}</p>
            {row.vehicleVin ? (
              <p className="text-muted-foreground font-mono text-xs">{row.vehicleVin}</p>
            ) : null}
            {row.vehicleStockNumber ? (
              <p className="text-muted-foreground text-xs">{row.vehicleStockNumber}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "type",
        header: t("inspections.table.type"),
        cell: (row) => t(`inspections.types.${row.inspectionType}`),
      },
      {
        key: "branch",
        header: t("inspections.table.branch"),
        cell: (row) => row.branchName ?? "—",
      },
      {
        key: "assignee",
        header: t("inspections.table.assignee"),
        cell: (row) => row.assignedToName ?? "—",
      },
      {
        key: "status",
        header: t("inspections.table.status"),
        cell: (row) => <InspectionStatusBadge status={row.status} />,
      },
      {
        key: "result",
        header: t("inspections.table.result"),
        cell: (row) => <InspectionResultBadge result={row.result} />,
      },
      {
        key: "score",
        header: t("inspections.table.score"),
        className: "tabular-nums",
        cell: (row) => (row.overallScore != null ? `${row.overallScore}%` : "—"),
      },
      {
        key: "updated",
        header: t("inspections.table.updated"),
        className: "tabular-nums",
        cell: (row) => formatDate(row.updatedAt, locale, "medium"),
      },
      {
        key: "actions",
        header: t("inspections.table.actions"),
        className: "text-end",
        cell: (row) => (
          <Link
            href={`/inspections/${row.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {t("inspections.table.view")}
          </Link>
        ),
      },
    ],
    [t, locale],
  );

  return (
    <ResponsiveTable
      columns={columns}
      rows={inspections}
      renderCard={(inspection) => (
        <InspectionCard key={inspection.id} inspection={inspection} />
      )}
    />
  );
}
