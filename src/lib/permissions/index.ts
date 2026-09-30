/**
 * Permission keys mirror public.permissions.key.
 * Frontend checks are UX only — RLS and server requirePermission are the boundary.
 */
export const permissionCatalog = [
  "dashboard.view",
  "vehicle.view",
  "vehicle.create",
  "vehicle.edit",
  "vehicle.delete",
  "vehicle.cost.view",
  "vehicle.cost.edit",
  "vehicle.price.view",
  "vehicle.price.edit",
  "vehicle.profit.view",
  "acquisition.view",
  "acquisition.create",
  "acquisition.edit",
  "inspection.view",
  "inspection.create",
  "inspection.edit",
  "inspection.approve",
  "workshop.view",
  "workshop.create",
  "workshop.edit",
  "customer.view",
  "customer.create",
  "customer.edit",
  "lead.view",
  "lead.create",
  "lead.edit",
  "reservation.view",
  "reservation.create",
  "reservation.cancel",
  "sale.view",
  "sale.create",
  "sale.edit",
  "sale.cancel",
  "payment.view",
  "payment.create",
  "payment.refund",
  "invoice.view",
  "invoice.create",
  "invoice.edit",
  "document.view",
  "document.create",
  "document.edit",
  "report.view",
  "report.financial.view",
  "branch.view",
  "branch.manage",
  "user.manage",
  "role.manage",
  "audit.view",
  "notification.view",
  "settings.view",
  "settings.manage",
] as const;

export type Permission = (typeof permissionCatalog)[number];

const permissionSet = new Set<string>(permissionCatalog);

export function isPermission(value: string): value is Permission {
  return permissionSet.has(value);
}

export function hasPermission(
  permissions: readonly string[],
  permission: Permission,
  roles: readonly string[] = [],
) {
  if (roles.includes("super_admin")) return true;
  return permissions.includes(permission);
}

export function hasAnyPermission(
  permissions: readonly string[],
  required: readonly Permission[],
  roles: readonly string[] = [],
) {
  return required.some((permission) => hasPermission(permissions, permission, roles));
}

/** @deprecated Use hasPermission with UserContext.permissions */
export function canAccess(permission: Permission, permissions: readonly string[] | null) {
  if (!permissions) return false;
  return hasPermission(permissions, permission);
}

/** Route → required permission. First matching prefix wins (longest should be listed first). */
export const routePermissions: { prefix: string; permission: Permission }[] = [
  { prefix: "/inventory/new", permission: "vehicle.create" },
  { prefix: "/inventory", permission: "vehicle.view" },
  { prefix: "/acquisitions/new", permission: "acquisition.create" },
  { prefix: "/acquisitions", permission: "acquisition.view" },
  { prefix: "/inspections/new", permission: "inspection.create" },
  { prefix: "/inspections", permission: "inspection.view" },
  { prefix: "/workshop", permission: "workshop.view" },
  { prefix: "/customers/new", permission: "customer.create" },
  { prefix: "/customers", permission: "customer.view" },
  { prefix: "/leads", permission: "lead.view" },
  { prefix: "/reservations/new", permission: "reservation.create" },
  { prefix: "/reservations", permission: "reservation.view" },
  { prefix: "/sales/new", permission: "sale.create" },
  { prefix: "/sales", permission: "sale.view" },
  { prefix: "/payments", permission: "payment.view" },
  { prefix: "/invoices", permission: "invoice.view" },
  { prefix: "/documents", permission: "document.view" },
  { prefix: "/reports", permission: "report.view" },
  { prefix: "/branches", permission: "branch.view" },
  { prefix: "/users", permission: "user.manage" },
  { prefix: "/roles", permission: "role.manage" },
  { prefix: "/audit-logs", permission: "audit.view" },
  { prefix: "/notifications", permission: "notification.view" },
  { prefix: "/settings", permission: "settings.view" },
  { prefix: "/dashboard", permission: "dashboard.view" },
];

export function permissionForPath(pathname: string): Permission | null {
  const match = routePermissions.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return match?.permission ?? null;
}
