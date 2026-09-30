"use client";

import { ChevronLeftIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/shared/brand-mark";
import { NavLink } from "@/components/navigation/nav-link";
import { Button } from "@/components/ui/button";
import { filterNavigation, navigation } from "@/config/navigation";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations();
  const { can } = usePermission();
  const items = useMemo(() => filterNavigation(navigation, can), [can]);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed && "justify-center px-2",
        )}
      >
        <BrandMark showName={!collapsed} className="text-sidebar-foreground" />
      </div>
      <nav aria-label={t("app.name")} className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {items.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.labelKey && !collapsed ? (
              <p className="text-sidebar-foreground/55 px-3 pb-1 text-[0.7rem] font-medium tracking-wide uppercase">
                {t(group.labelKey as Parameters<typeof t>[0])}
              </p>
            ) : null}
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <Button
          type="button"
          variant="ghost"
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start"
          onClick={onToggle}
          aria-pressed={collapsed}
        >
          <ChevronLeftIcon className={cn("rtl:rotate-180", collapsed && "rotate-180 rtl:rotate-0")} />
          <span className={cn(collapsed && "sr-only")}>
            {collapsed ? t("nav.expand") : t("nav.collapse")}
          </span>
        </Button>
      </div>
    </aside>
  );
}
