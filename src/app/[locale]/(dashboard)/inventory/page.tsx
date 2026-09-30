import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ModuleScreen } from "@/components/layout/module-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.inventory.title") };
}

export default function Page() {
  return (
    <ModuleScreen
      titleKey="modules.inventory.title"
      descriptionKey="modules.inventory.description"
      emptyTitleKey="empty.vehicles"
      emptyDescriptionKey="empty.vehiclesHint"
    />
  );
}
