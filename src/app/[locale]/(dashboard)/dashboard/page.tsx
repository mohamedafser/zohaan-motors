import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requirePagePermission } from "@/lib/auth/authorize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("dashboard.title") };
}

export default async function DashboardPage() {
  const context = await requirePagePermission("dashboard.view");
  return <DashboardView context={context} />;
}
