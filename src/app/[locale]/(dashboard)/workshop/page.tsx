import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ModuleScreen } from "@/components/layout/module-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.workshop.title") };
}

export default function Page() {
  return (
    <ModuleScreen
      permission="workshop.view"
      titleKey="modules.workshop.title"
      descriptionKey="modules.workshop.description"
    />
  );
}
