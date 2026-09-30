import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/forms/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("auth.login.title") };
}

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.login.title")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("auth.login.description")}</p>
      </div>
      <LoginForm />
    </div>
  );
}
