import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/navigation/language-switcher";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { BrandMark } from "@/components/shared/brand-mark";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <section className="bg-sidebar text-sidebar-foreground hidden flex-col justify-between p-10 lg:flex">
        <BrandMark className="text-sidebar-foreground" />
        <div>
          <p className="text-brand text-xs font-medium tracking-[0.18em] uppercase">
            {t("app.region")}
          </p>
          <h2 className="mt-4 max-w-md text-4xl font-semibold tracking-tight text-balance">
            {t("app.tagline")}
          </h2>
        </div>
        <p className="text-sidebar-foreground/70 max-w-sm text-sm">{t("app.footnote")}</p>
      </section>
      <div className="flex min-h-svh flex-col px-4 py-6 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto grid w-full max-w-md flex-1 content-center gap-8">{children}</div>
      </div>
    </div>
  );
}
