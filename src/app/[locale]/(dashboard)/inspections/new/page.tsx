import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InspectionFormPage } from "@/components/inspections/inspection-form-page";
import { requirePagePermission } from "@/lib/auth/authorize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.inspectionsNew.title") };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  await requirePagePermission("inspection.create");
  const params = await searchParams;

  return <InspectionFormPage defaultVehicleId={params.vehicleId} />;
}
