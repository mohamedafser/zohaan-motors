import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ImageUploader } from "@/components/media/image-uploader";
import { ModuleScreen } from "@/components/layout/module-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.inventoryNew.title") };
}

export default function NewVehiclePage() {
  return (
    <ModuleScreen
      permission="vehicle.create"
      titleKey="modules.inventoryNew.title"
      descriptionKey="modules.inventoryNew.description"
    >
      <ImageUploader />
    </ModuleScreen>
  );
}
