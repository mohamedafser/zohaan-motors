import type { AuthUser } from "@/types/auth";

/**
 * Permission catalog for the later RBAC phase.
 * Authenticated access is the only check until roles are stored in the database.
 * Do not hide buttons from this module yet — that would look like enforcement
 * without a server-side source of truth.
 */
export const permissionCatalog = {
  dashboard: ["dashboard.view"],
  inventory: ["inventory.view", "inventory.manage"],
  acquisitions: ["acquisitions.view", "acquisitions.manage"],
  inspections: ["inspections.view", "inspections.manage"],
  workshop: ["workshop.view", "workshop.manage"],
  customers: ["customers.view", "customers.manage"],
  leads: ["leads.view", "leads.manage"],
  reservations: ["reservations.view", "reservations.manage"],
  sales: ["sales.view", "sales.manage"],
  payments: ["payments.view", "payments.manage"],
  invoices: ["invoices.view", "invoices.manage"],
  documents: ["documents.view", "documents.manage"],
  reports: ["reports.view"],
  branches: ["branches.view", "branches.manage"],
  users: ["users.view", "users.manage"],
  roles: ["roles.view", "roles.manage"],
  auditLogs: ["audit.view"],
  settings: ["settings.view", "settings.manage"],
} as const;

type PermissionGroup = (typeof permissionCatalog)[keyof typeof permissionCatalog];
export type Permission = PermissionGroup[number];

export function canAccess(_permission: Permission, user: AuthUser | null) {
  return user !== null;
}
