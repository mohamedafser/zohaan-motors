import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ModuleScreen } from "@/components/layout/module-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.users.title") };
}

export default function Page() {
  return (
    <ModuleScreen
      titleKey="modules.users.title"
      descriptionKey="modules.users.description"
    />
  );
}
