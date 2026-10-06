import { CarIcon, ClipboardCheckIcon, HandshakeIcon, UserPlusIcon } from "lucide-react";

export const protectedPrefixes = [
  "/dashboard",
  "/inventory",
  "/acquisitions",
  "/inspections",
  "/pricing",
  "/customers",
  "/leads",
  "/reservations",
  "/sales",
  "/payments",
  "/invoices",
  "/documents",
  "/reports",
  "/branches",
  "/users",
  "/vehicle-catalog",
  "/roles",
  "/audit-logs",
  "/notifications",
  "/settings",
  "/unauthorized",
] as const;

const publicAuthPaths = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
  "/verify-email",
]);

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPublicAuthPath(pathname: string) {
  return publicAuthPaths.has(pathname);
}

export const breadcrumbLabels: Record<string, string> = {
  dashboard: "nav.dashboard",
  inventory: "nav.inventory",
  acquisitions: "nav.acquisitions",
  inspections: "nav.inspections",
  pricing: "nav.pricing",
  customers: "nav.customers",
  leads: "nav.leads",
  reservations: "nav.reservations",
  sales: "nav.sales",
  payments: "nav.payments",
  invoices: "nav.invoices",
  documents: "nav.documents",
  reports: "nav.reports",
  branches: "nav.branches",
  users: "nav.users",
  "vehicle-catalog": "nav.vehicleCatalog",
  roles: "nav.roles",
  "audit-logs": "nav.auditLogs",
  notifications: "nav.notifications",
  settings: "nav.settings",
  new: "common.new",
  edit: "inventory.actions.edit",
  review: "inspections.actions.review",
  login: "auth.login.title",
  unauthorized: "auth.unauthorized.title",
};

export const searchGroups = [
  { id: "vehicles", labelKey: "search.groups.vehicles", href: "/inventory", permission: "vehicle.view" },
  {
    id: "inspections",
    labelKey: "search.groups.inspections",
    href: "/inspections",
    permission: "inspection.view",
  },
  { id: "customers", labelKey: "search.groups.customers", href: "/customers", permission: "customer.view" },
  { id: "leads", labelKey: "search.groups.leads", href: "/leads", permission: "lead.view" },
  { id: "sales", labelKey: "search.groups.sales", href: "/sales", permission: "sale.view" },
  { id: "payments", labelKey: "search.groups.payments", href: "/payments", permission: "payment.view" },
  {
    id: "documents",
    labelKey: "search.groups.documents",
    href: "/documents",
    permission: "document.view",
  },
] as const;

export const quickActions = [
  { href: "/inventory/new", labelKey: "quick.vehicle", permission: "vehicle.create", icon: CarIcon },
  {
    href: "/inspections/new",
    labelKey: "quick.inspection",
    permission: "inspection.create",
    icon: ClipboardCheckIcon,
  },
  { href: "/customers/new", labelKey: "quick.customer", permission: "customer.create", icon: UserPlusIcon },
  { href: "/sales/new", labelKey: "quick.sale", permission: "sale.create", icon: HandshakeIcon },
] as const;
