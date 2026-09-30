import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ModuleScreen } from "@/components/layout/module-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("modules.customers.title") };
}

export default function Page() {
  return (
    <ModuleScreen
      permission="customer.view"
      titleKey="modules.customers.title"
      descriptionKey="modules.customers.description"
      emptyTitleKey="empty.customers"
      emptyDescriptionKey="empty.customersHint"
    />
  );
}
