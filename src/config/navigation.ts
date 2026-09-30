import {
  Banknote,
  Bell,
  Bookmark,
  Building2,
  Car,
  ChartColumn,
  ClipboardCheck,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  UserCog,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

import type { Permission } from "@/lib/permissions";
import type { NavGroup } from "@/types/navigation";

export const navigation: NavGroup[] = [
  {
    id: "overview",
    items: [
      {
        href: "/dashboard",
        labelKey: "nav.dashboard",
        icon: LayoutDashboard,
        mobile: "home",
        permission: "dashboard.view",
      },
    ],
  },
  {
    id: "operations",
    labelKey: "nav.groups.operations",
    items: [
      {
        href: "/inventory",
        labelKey: "nav.inventory",
        icon: Car,
        mobile: "cars",
        permission: "vehicle.view",
      },
      {
        href: "/acquisitions",
        labelKey: "nav.acquisitions",
        icon: ShoppingBag,
        permission: "acquisition.view",
      },
      {
        href: "/inspections",
        labelKey: "nav.inspections",
        icon: ClipboardCheck,
        permission: "inspection.view",
      },
      { href: "/workshop", labelKey: "nav.workshop", icon: Wrench, permission: "workshop.view" },
    ],
  },
  {
    id: "crm",
    labelKey: "nav.groups.crm",
    items: [
      { href: "/customers", labelKey: "nav.customers", icon: Users, permission: "customer.view" },
      {
        href: "/leads",
        labelKey: "nav.leads",
        icon: UserPlus,
        mobile: "leads",
        permission: "lead.view",
      },
      {
        href: "/reservations",
        labelKey: "nav.reservations",
        icon: Bookmark,
        permission: "reservation.view",
      },
    ],
  },
  {
    id: "finance",
    labelKey: "nav.groups.finance",
    items: [
      { href: "/sales", labelKey: "nav.sales", icon: Handshake, permission: "sale.view" },
      { href: "/payments", labelKey: "nav.payments", icon: Banknote, permission: "payment.view" },
      { href: "/invoices", labelKey: "nav.invoices", icon: Receipt, permission: "invoice.view" },
    ],
  },
  {
    id: "insights",
    labelKey: "nav.groups.insights",
    items: [
      {
        href: "/documents",
        labelKey: "nav.documents",
        icon: FolderOpen,
        permission: "document.view",
      },
      { href: "/reports", labelKey: "nav.reports", icon: ChartColumn, permission: "report.view" },
    ],
  },
  {
    id: "admin",
    labelKey: "nav.groups.admin",
    items: [
      { href: "/branches", labelKey: "nav.branches", icon: Building2, permission: "branch.view" },
      { href: "/users", labelKey: "nav.users", icon: UserCog, permission: "user.manage" },
      { href: "/roles", labelKey: "nav.roles", icon: Shield, permission: "role.manage" },
      { href: "/audit-logs", labelKey: "nav.auditLogs", icon: ScrollText, permission: "audit.view" },
    ],
  },
  {
    id: "system",
    labelKey: "nav.groups.system",
    items: [
      {
        href: "/notifications",
        labelKey: "nav.notifications",
        icon: Bell,
        permission: "notification.view",
      },
      { href: "/settings", labelKey: "nav.settings", icon: Settings, permission: "settings.view" },
    ],
  },
];

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function filterNavigation(
  groups: NavGroup[],
  can: (permission: Permission) => boolean,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}
