import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ModuleScreen } from "@/components/layout/module-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.documents.title") };
}

export default function Page() {
  return (
    <ModuleScreen
      permission="document.view"
      titleKey="modules.documents.title"
      descriptionKey="modules.documents.description"
    />
  );
}
