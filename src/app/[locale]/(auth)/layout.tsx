import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/navigation/language-switcher";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { BrandMark } from "@/components/shared/brand-mark";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="grid h-svh overflow-y-auto lg:grid-cols-2">
      <section className="bg-sidebar text-sidebar-foreground relative isolate hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        {/* Decorative backdrop: soft brand glow over a faint grid. */}
        <div
          className="absolute inset-0 -z-10 [background-image:linear-gradient(var(--sidebar-foreground)_1px,transparent_1px),linear-gradient(90deg,var(--sidebar-foreground)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_30%_60%,black,transparent_75%)] [background-size:48px_48px] opacity-[0.07]"
          aria-hidden
        />
        <div
          className="bg-brand/25 absolute -start-24 -bottom-40 -z-10 size-[32rem] rounded-full blur-[120px]"
          aria-hidden
        />
        <div
          className="bg-chart-2/40 absolute -end-24 -top-32 -z-10 size-96 rounded-full blur-[110px]"
          aria-hidden
        />
        <BrandMark className="text-sidebar-foreground [&_span]:text-base" />
        <div>
          <p className="text-sidebar-primary border-sidebar-primary/30 bg-sidebar-primary/10 inline-flex rounded-full border px-3 py-1 text-xs font-medium tracking-[0.14em] uppercase">
            {t("app.region")}
          </p>
          <h2 className="mt-6 max-w-lg text-5xl leading-[1.05] font-semibold tracking-tight text-balance">
            {t("app.tagline")}
          </h2>
          <p className="text-sidebar-foreground/65 mt-5 max-w-md text-base text-pretty">
            {t("app.footnote")}
          </p>
        </div>
        <p className="text-sidebar-foreground/40 text-xs">
          © {new Date().getFullYear()} {t("app.name")}
        </p>
      </section>
      <div className="flex min-h-full flex-col px-4 py-6 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto grid w-full max-w-sm flex-1 content-center gap-8 pb-12">
          {children}
        </div>
      </div>
    </div>
  );
}
