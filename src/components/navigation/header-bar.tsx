"use client";

import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/navigation/language-switcher";
import { NotificationMenu } from "@/components/navigation/notification-menu";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { BrandMark } from "@/components/shared/brand-mark";
import type { UserContext } from "@/types/auth";

export function HeaderBar({ user }: { user: UserContext }) {
  const t = useTranslations();

  return (
    <header className="bg-background/85 supports-backdrop-filter:bg-background/70 relative z-30 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6 lg:px-8">
      {/* Gold pinstripe along the bottom edge. */}
      <span
        className="via-brand/50 animate-grow-x pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent to-transparent"
        aria-hidden
      />
      <div className="min-w-0 lg:hidden">
        <BrandMark showName={false} />
        <span className="sr-only">{t("app.name")}</span>
      </div>
      <div className="ms-auto flex items-center gap-1.5">
        <div className="hidden items-center gap-0.5 md:flex">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
        <NotificationMenu />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
