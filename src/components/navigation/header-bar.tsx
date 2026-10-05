"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { GlobalSearch } from "@/components/navigation/global-search";
import { LanguageSwitcher } from "@/components/navigation/language-switcher";
import { NotificationMenu } from "@/components/navigation/notification-menu";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { BrandMark } from "@/components/shared/brand-mark";
import type { UserContext } from "@/types/auth";

export function HeaderBar({ user }: { user: UserContext }) {
  const t = useTranslations();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="bg-background z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
      <div className="min-w-0 lg:hidden">
        <BrandMark showName={false} />
        <span className="sr-only">{t("app.name")}</span>
      </div>
      <div className="ms-auto flex items-center gap-1">
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <div className="hidden items-center gap-1 md:flex">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
        <NotificationMenu />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
