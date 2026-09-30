import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MfaPanel } from "@/components/forms/mfa-panel";
import { getSessionUser, mfaStatus } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("auth.mfa.title") };
}

export default async function MfaPage() {
  const t = await getTranslations();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const status = await mfaStatus();
  if (status === "verified") redirect("/dashboard");

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.mfa.title")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("auth.mfa.description")}</p>
      </div>
      <MfaPanel mode={status === "required" ? "challenge" : "enroll"} />
    </div>
  );
}
