import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ModuleScreen } from "@/components/layout/module-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.reservations.title") };
}

export default function Page() {
  return (
    <ModuleScreen
      permission="reservation.view"
      titleKey="modules.reservations.title"
      descriptionKey="modules.reservations.description"
    />
  );
}
