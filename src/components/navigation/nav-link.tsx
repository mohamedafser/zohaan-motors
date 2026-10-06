"use client";

import { useTranslations } from "next-intl";

import { isNavItemActive } from "@/config/navigation";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavItem } from "@/types/navigation";

export function NavLink({
  item,
  collapsed = false,
  onNavigate,
  tone = "sidebar",
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
  tone?: "sidebar" | "surface";
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const active = isNavItemActive(pathname, item.href);
  const label = t(item.labelKey as Parameters<typeof t>[0]);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/nav relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2",
        collapsed && "justify-center px-0",
        tone === "surface" && "h-11",
        tone === "sidebar" && "focus-visible:ring-sidebar-ring",
        tone === "surface" && "focus-visible:ring-ring",
        tone === "sidebar" &&
          (active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"),
        tone === "surface" &&
          (active ? "bg-brand-soft text-foreground" : "text-foreground hover:bg-muted"),
      )}
    >
      {active && tone === "sidebar" ? (
        <span
          className={cn(
            "bg-sidebar-primary absolute inset-y-2 w-1 rounded-e-full",
            collapsed ? "-start-2.5" : "-start-3",
          )}
          aria-hidden
        />
      ) : null}
      <Icon
        className={cn(
          "size-[1.125rem] shrink-0 transition-colors",
          active && (tone === "sidebar" ? "text-sidebar-primary" : "text-brand"),
        )}
        aria-hidden
      />
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="inline-end">{label}</TooltipContent>
    </Tooltip>
  );
}
