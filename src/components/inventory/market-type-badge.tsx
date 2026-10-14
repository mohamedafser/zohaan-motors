"use client";

import { CarFrontIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Sheen } from "@/components/inventory/vehicle-sold-tag";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VehicleMarketType } from "@/types/vehicle";

// New is solid brand gold; Used is a quiet chrome tag so New stands out beside it.
const STYLES: Record<VehicleMarketType, string> = {
  new: "bg-gold text-brand-foreground border-transparent font-semibold shadow-sm",
  used: "border-chrome/60 bg-chrome/15 text-foreground/75",
};

const ICONS: Record<VehicleMarketType, typeof SparklesIcon> = {
  new: SparklesIcon,
  used: CarFrontIcon,
};

export function MarketTypeBadge({
  value,
  className,
}: {
  value: VehicleMarketType | null | undefined;
  className?: string;
}) {
  const t = useTranslations();
  const type: VehicleMarketType = value === "new" ? "new" : "used";
  const Icon = ICONS[type];

  return (
    <Badge variant="outline" className={cn(STYLES[type], className)}>
      <Icon data-icon="inline-start" aria-hidden />
      {t(`inventory.enums.marketType.${type}`)}
    </Badge>
  );
}

/** Gold "New" badge laid over a new car's main photo. */
export function NewCarBadge({ className }: { className?: string }) {
  const t = useTranslations();
  return (
    <span
      className={cn(
        "animate-pop relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-full ps-1 pe-3.5",
        "bg-gold text-brand-foreground shadow-lg ring-1 shadow-black/25 ring-white/30",
        className,
      )}
    >
      <Sheen />
      <span className="flex size-6 items-center justify-center rounded-full bg-black/15">
        <SparklesIcon className="size-3.5" aria-hidden />
      </span>
      <span className="text-xs font-bold tracking-[0.2em] uppercase">
        {t("inventory.enums.marketType.new")}
      </span>
    </span>
  );
}
