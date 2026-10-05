"use client";

import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/shared/status-badge";
import type { VehicleStatus } from "@/types/vehicle";

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const t = useTranslations();
  return <StatusBadge status={status} label={t(`inventory.status.${status}`)} />;
}
