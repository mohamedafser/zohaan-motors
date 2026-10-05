import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InspectionDetailClient } from "@/components/inspections/inspection-detail-client";
import { requirePagePermission } from "@/lib/auth/authorize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.inspections.title") };
}

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("inspection.view");
  const { id } = await params;

  return <InspectionDetailClient inspectionId={id} />;
}
