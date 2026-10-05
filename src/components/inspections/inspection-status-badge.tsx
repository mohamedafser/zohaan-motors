"use client";

import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/shared/status-badge";
import type { InspectionStatus } from "@/types/inspection";

export function InspectionStatusBadge({ status }: { status: InspectionStatus }) {
  const t = useTranslations();
  return <StatusBadge status={status} label={t(`inspections.status.${status}`)} />;
}
