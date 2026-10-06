"use client";

import { CarFrontIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VehicleMarketType } from "@/types/vehicle";

const STYLES: Record<VehicleMarketType, string> = {
  new: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  used: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
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
