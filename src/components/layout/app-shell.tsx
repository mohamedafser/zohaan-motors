"use client";

import { useTranslations } from "next-intl";

import { MobileNav } from "@/components/navigation/mobile-nav";
import { HeaderBar } from "@/components/navigation/header-bar";
import { Sidebar } from "@/components/navigation/sidebar";
import { PermissionProvider } from "@/hooks/use-permission";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import type { UserContext } from "@/types/auth";

export function AppShell({
  user,
  children,
}: {
  user: UserContext;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <PermissionProvider value={user}>
      <NotificationProvider>
        <div className="bg-background min-h-svh">
          <a
            href="#main"
            className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:start-4 focus:top-3"
          >
            {t("app.skip")}
          </a>
          <div className="flex min-h-svh">
            <Sidebar collapsed={collapsed} onToggle={toggle} />
            <div className="flex min-w-0 flex-1 flex-col">
              <HeaderBar user={user} />
              <main
                id="main"
                className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 lg:px-8 lg:py-6 lg:pb-8"
              >
                {children}
              </main>
            </div>
          </div>
          <MobileNav />
        </div>
      </NotificationProvider>
    </PermissionProvider>
  );
}
