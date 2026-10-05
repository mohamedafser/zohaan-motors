import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { VehicleFormPage } from "@/components/inventory/vehicle-form-page";
import { requirePagePermission } from "@/lib/auth/authorize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("inventory.form.editTitle") };
}

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("vehicle.edit");
  const { id } = await params;

  return <VehicleFormPage mode="edit" vehicleId={id} />;
}
