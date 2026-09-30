import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getSessionUser, mfaStatus } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const status = await mfaStatus();
  if (status === "required") redirect("/mfa");

  return <AppShell user={user}>{children}</AppShell>;
}
