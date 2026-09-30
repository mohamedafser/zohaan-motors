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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2",
        collapsed && "justify-center px-0",
        tone === "sidebar" && "focus-visible:ring-sidebar-ring",
        tone === "surface" && "focus-visible:ring-ring",
        tone === "sidebar" &&
          (active
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--brand)] rtl:shadow-[inset_-2px_0_0_0_var(--brand)]"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"),
        tone === "surface" &&
          (active
            ? "bg-muted text-foreground"
            : "text-foreground hover:bg-muted"),
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
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
