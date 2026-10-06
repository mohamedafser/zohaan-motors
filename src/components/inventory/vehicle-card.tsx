"use client";

import { ImageIcon, MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAppLocale, vehicleTitle } from "@/components/inventory/inventory-utils";
import { VehicleStatusBadge } from "@/components/inventory/vehicle-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePermission } from "@/hooks/use-permission";
import { Link } from "@/lib/i18n/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils/currency";
import type { VehicleListItem } from "@/types/vehicle";

export function VehicleCard({ vehicle }: { vehicle: VehicleListItem }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const { can } = usePermission();
  const showPrice = can("vehicle.price.view") && vehicle.currentSellingPrice != null;
  const place = [vehicle.branchName, vehicle.locationName].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/inventory/${vehicle.id}`}
      className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="overflow-hidden pt-0 transition-shadow hover:shadow-md">
        <div className="bg-muted relative aspect-[16/10] w-full overflow-hidden">
          {vehicle.primaryPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img
              src={vehicle.primaryPhotoUrl}
              alt={vehicleTitle(vehicle)}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center">
              <ImageIcon className="size-8" aria-hidden />
            </div>
          )}
          <div className="absolute start-3 top-3 rounded-full bg-white/90 shadow-sm backdrop-blur dark:bg-black/60">
            <VehicleStatusBadge status={vehicle.status} />
          </div>
        </div>
        <CardContent className="grid gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs tabular-nums">{vehicle.stockNumber}</p>
            <p className="truncate text-base font-semibold tracking-tight">
              {vehicleTitle(vehicle)}
            </p>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="tabular-nums">
              {formatNumber(vehicle.mileage, locale)}{" "}
              {t(`inventory.enums.mileageUnit.${vehicle.mileageUnit}`)}
            </span>
            {vehicle.vin ? <span className="font-mono text-xs">{vehicle.vin}</span> : null}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place || t("inventory.fields.notSet")}</span>
            </span>
            {showPrice ? (
              <span className="text-base font-semibold tabular-nums">
                {formatCurrency(vehicle.currentSellingPrice as number, locale)}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
