import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InspectionPerformClient } from "@/components/inspections/inspection-perform-client";
import { requirePagePermission } from "@/lib/auth/authorize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("inspections.perform.title") };
}

export default async function EditInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("inspection.edit");
  const { id } = await params;

  return <InspectionPerformClient inspectionId={id} />;
}
