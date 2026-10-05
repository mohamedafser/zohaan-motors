import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InspectionReviewClient } from "@/components/inspections/inspection-review-client";
import { requireAnyPagePermission } from "@/lib/auth/authorize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("inspections.review.title") };
}

export default async function ReviewInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyPagePermission(["inspection.approve", "inspection.review"]);
  const { id } = await params;

  return <InspectionReviewClient inspectionId={id} />;
}
