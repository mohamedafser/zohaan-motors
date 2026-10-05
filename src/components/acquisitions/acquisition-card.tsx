"use client";

import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { AcquisitionStatusBadge } from "@/components/acquisitions/acquisition-status-badge";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { Card, CardContent } from "@/components/ui/card";
import { usePermission } from "@/hooks/use-permission";
import { Link } from "@/lib/i18n/navigation";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { AcquisitionListItem } from "@/types/acquisition";

function vehicleLabel(item: AcquisitionListItem) {
  return [item.vehicleYear, item.vehicleMake, item.vehicleModel].filter(Boolean).join(" ") || "—";
}

export function AcquisitionCard({ acquisition }: { acquisition: AcquisitionListItem }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const { can } = usePermission();
  const showCost =
    (can("acquisition.cost.view") || can("vehicle.cost.view")) && acquisition.purchasePrice != null;

  return (
    <Link
      href={`/acquisitions/${acquisition.id}`}
      className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="hover:bg-muted/40 transition-colors">
        <CardContent className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs tabular-nums">
                {acquisition.acquisitionNumber}
              </p>
              <p className="truncate text-base font-medium">{vehicleLabel(acquisition)}</p>
            </div>
            <AcquisitionStatusBadge status={acquisition.status} />
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>{t(`acquisitions.sourceTypes.${acquisition.sourceType}`)}</span>
            {acquisition.purchaseDate ? (
              <span className="tabular-nums">
                {formatDate(acquisition.purchaseDate, locale, "medium")}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {acquisition.branchName || t("acquisitions.fields.notSet")}
              </span>
            </span>
            {showCost ? (
              <span className="font-medium tabular-nums">
                {formatCurrency(acquisition.purchasePrice as number, locale)}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
