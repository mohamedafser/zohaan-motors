import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("auth.reset.title") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.reset.title")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("auth.reset.description")}</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
