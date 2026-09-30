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
      },
    ],
  },
  {
    id: "operations",
    labelKey: "nav.groups.operations",
    items: [
      { href: "/inventory", labelKey: "nav.inventory", icon: Car, mobile: "cars" },
      { href: "/acquisitions", labelKey: "nav.acquisitions", icon: ShoppingBag },
      { href: "/inspections", labelKey: "nav.inspections", icon: ClipboardCheck },
      { href: "/workshop", labelKey: "nav.workshop", icon: Wrench },
    ],
  },
  {
    id: "crm",
    labelKey: "nav.groups.crm",
    items: [
      { href: "/customers", labelKey: "nav.customers", icon: Users },
      { href: "/leads", labelKey: "nav.leads", icon: UserPlus, mobile: "leads" },
      { href: "/reservations", labelKey: "nav.reservations", icon: Bookmark },
    ],
  },
  {
    id: "finance",
    labelKey: "nav.groups.finance",
    items: [
      { href: "/sales", labelKey: "nav.sales", icon: Handshake },
      { href: "/payments", labelKey: "nav.payments", icon: Banknote },
      { href: "/invoices", labelKey: "nav.invoices", icon: Receipt },
    ],
  },
  {
    id: "insights",
    labelKey: "nav.groups.insights",
    items: [
      { href: "/documents", labelKey: "nav.documents", icon: FolderOpen },
      { href: "/reports", labelKey: "nav.reports", icon: ChartColumn },
    ],
  },
  {
    id: "admin",
    labelKey: "nav.groups.admin",
    items: [
      { href: "/branches", labelKey: "nav.branches", icon: Building2 },
      { href: "/users", labelKey: "nav.users", icon: UserCog },
      { href: "/roles", labelKey: "nav.roles", icon: Shield },
      { href: "/audit-logs", labelKey: "nav.auditLogs", icon: ScrollText },
    ],
  },
  {
    id: "system",
    labelKey: "nav.groups.system",
    items: [
      { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
      { href: "/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
