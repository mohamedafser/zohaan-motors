import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { requireUserContext } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await requireUserContext();

  if (context.status === "INVITED") {
    redirect("/accept-invitation");
  }

  return <AppShell user={context}>{children}</AppShell>;
}
