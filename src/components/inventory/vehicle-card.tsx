"use client";

import { ImageIcon, MapPinIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { BookVehicleButton } from "@/components/inventory/book-vehicle-button";
import { useAppLocale, vehicleTitle } from "@/components/inventory/inventory-utils";
import { MarketTypeBadge } from "@/components/inventory/market-type-badge";
import { QuantityBadge } from "@/components/inventory/quantity-badge";
import { VehiclePrice, listPrice } from "@/components/inventory/vehicle-price";
import { VehicleStatusBadge } from "@/components/inventory/vehicle-status-badge";
import { VehicleStatusTrigger } from "@/components/inventory/vehicle-status-trigger";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermission } from "@/hooks/use-permission";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/currency";
import type { VehicleListItem } from "@/types/vehicle";
import { vehicleHref } from "@/lib/vehicles/routes";

export function VehicleCard({ vehicle }: { vehicle: VehicleListItem }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const { can } = usePermission();
  const showPrice = can("vehicle.price.view") && listPrice(vehicle) != null;
  const place = [vehicle.branchName, vehicle.locationName].filter(Boolean).join(" · ");

  return (
    <Card className="overflow-hidden pt-0 transition-shadow hover:shadow-md">
      <Link
        href={vehicleHref(vehicle.stockNumber)}
        className="focus-visible:ring-ring/50 block outline-none focus-visible:ring-3"
      >
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
          <div className="absolute start-3 top-3 flex flex-wrap gap-2">
            <VehicleStatusBadge status={vehicle.status} />
            <MarketTypeBadge value={vehicle.marketType} />
            <QuantityBadge quantity={vehicle.quantity} />
          </div>
        </div>
        <CardContent className="grid gap-3 pt-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs tabular-nums">{vehicle.stockNumber}</p>
            <p className="truncate text-base font-semibold tracking-tight">
              {vehicle.make} {vehicle.model}
            </p>
            {vehicle.variant ? (
              <p className="text-muted-foreground truncate text-sm">{vehicle.variant}</p>
            ) : null}
            <p className="text-muted-foreground text-sm tabular-nums">
              {vehicle.year} · {formatNumber(vehicle.mileage, locale)}{" "}
              {t(`inventory.enums.mileageUnit.${vehicle.mileageUnit}`)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place || t("inventory.fields.notSet")}</span>
            </span>
            {showPrice ? (
              <VehiclePrice vehicle={vehicle} className="text-end" amountClassName="text-base font-semibold" />
            ) : null}
          </div>
        </CardContent>
      </Link>
      {/* Each action renders nothing when unavailable; empty:hidden then drops the bar. */}
      <div className="flex flex-wrap gap-2 border-t px-4 py-3 empty:hidden" data-row-stop>
        <VehicleStatusTrigger vehicle={vehicle} variant="button" />
        {can("vehicle.edit") ? (
          <Link
            href={vehicleHref(vehicle.stockNumber, "/edit")}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={(event) => event.stopPropagation()}
          >
            <PencilIcon className="size-4" aria-hidden />
            {t("inventory.actions.edit")}
          </Link>
        ) : null}
        <BookVehicleButton vehicle={vehicle} variant="outline" />
      </div>
    </Card>
  );
}
