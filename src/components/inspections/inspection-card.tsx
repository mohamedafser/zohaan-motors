"use client";

import { AlertTriangleIcon, MapPinIcon, UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { InspectionResultBadge } from "@/components/inspections/inspection-result-badge";
import { InspectionStatusBadge } from "@/components/inspections/inspection-status-badge";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/lib/i18n/navigation";
import { formatDate } from "@/lib/utils/date";
import type { InspectionListItem } from "@/types/inspection";

function vehicleLabel(item: InspectionListItem) {
  return [item.vehicleYear, item.vehicleMake, item.vehicleModel].filter(Boolean).join(" ") || "—";
}

export function InspectionCard({ inspection }: { inspection: InspectionListItem }) {
  const t = useTranslations();
  const locale = useAppLocale();

  return (
    <Link
      href={`/inspections/${inspection.id}`}
      className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="hover:bg-muted/40 transition-colors">
        <CardContent className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs tabular-nums">
                {inspection.inspectionNumber}
              </p>
              <p className="truncate text-base font-medium">{vehicleLabel(inspection)}</p>
            </div>
            <InspectionStatusBadge status={inspection.status} />
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>{t(`inspections.types.${inspection.inspectionType}`)}</span>
            <InspectionResultBadge result={inspection.result} />
            {inspection.submittedAt ? (
              <span className="tabular-nums">
                {formatDate(inspection.submittedAt, locale, "medium")}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {inspection.branchName || t("inspections.fields.notSet")}
              </span>
            </span>
            <span className="text-muted-foreground flex items-center gap-2">
              {inspection.criticalFindingsCount > 0 ? (
                <span className="text-rose-700 dark:text-rose-300 inline-flex items-center gap-1 text-xs font-medium">
                  <AlertTriangleIcon className="size-3.5" aria-hidden />
                  {inspection.criticalFindingsCount}
                </span>
              ) : null}
              {inspection.assignedToName ? (
                <span className="inline-flex items-center gap-1 truncate text-xs">
                  <UserIcon className="size-3.5 shrink-0" aria-hidden />
                  {inspection.assignedToName}
                </span>
              ) : null}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
