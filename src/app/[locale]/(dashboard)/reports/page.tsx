import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ModuleScreen } from "@/components/layout/module-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.reports.title") };
}

export default function Page() {
  return (
    <ModuleScreen
      titleKey="modules.reports.title"
      descriptionKey="modules.reports.description"
    />
  );
}
