import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { VehicleDetailClient } from "@/components/inventory/vehicle-detail-client";
import { requirePagePermission } from "@/lib/auth/authorize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.inventory.title") };
}

const VEHICLE_TABS = new Set([
  "overview",
  "acquisition",
  "pricing",
  "photos",
  "documents",
  "history",
]);

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("vehicle.view");
  const { id } = await params;
  const query = await searchParams;
  const rawTab = query.tab;
  const tab =
    typeof rawTab === "string" && VEHICLE_TABS.has(rawTab) ? rawTab : undefined;

  return <VehicleDetailClient vehicleId={id} initialTab={tab} />;
}
