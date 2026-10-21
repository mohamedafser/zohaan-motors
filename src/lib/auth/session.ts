import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Permission } from "@/lib/permissions";
import { isPermission } from "@/lib/permissions";
import type { AuthUser, BranchAccessScope, UserContext, UserStatus } from "@/types/auth";

type ProfileRow = {
  id: string;
  display_name: string;
  employee_code: string | null;
  phone: string | null;
  avatar_url: string | null;
  branch_id: string | null;
  status: "active" | "invited" | "suspended" | "disabled";
  deleted_at: string | null;
};

type UserRoleBranchRow = {
  branch_id: string | null;
};

type RoleJoinRow = {
  branch_id: string | null;
  role_id: string;
  roles: { key: string } | { key: string }[] | null;
};

type PermissionJoinRow = {
  permissions: { key: string } | { key: string }[] | null;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function roleKeyFromJoin(roles: RoleJoinRow["roles"]): string | null {
  if (!roles) return null;
  if (Array.isArray(roles)) return roles[0]?.key ?? null;
  return roles.key ?? null;
}

function permissionKeyFromJoin(permissions: PermissionJoinRow["permissions"]): string | null {
  if (!permissions) return null;
  if (Array.isArray(permissions)) return permissions[0]?.key ?? null;
  return permissions.key ?? null;
}

/**
 * Prefer SECURITY DEFINER RPCs when Phase 4 helpers are applied.
 * Fall back to a service-role read scoped to the JWT user when RPCs/RLS are missing.
 */
async function loadRolesAndPermissions(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{
  roles: string[];
  permissions: Permission[];
  roleBranches: UserRoleBranchRow[];
}> {
  const [rolesRpc, permsRpc, branchesQuery] = await Promise.all([
    supabase.rpc("current_user_roles"),
    supabase.rpc("current_user_permissions"),
    supabase.from("user_roles").select("branch_id").eq("user_id", userId),
  ]);

  const rolesFromRpc = !rolesRpc.error ? asStringArray(rolesRpc.data) : null;
  const permissionsFromRpc = !permsRpc.error
    ? asStringArray(permsRpc.data).filter(isPermission)
    : null;
  const branchesFromUser =
    !branchesQuery.error && Array.isArray(branchesQuery.data)
      ? (branchesQuery.data as UserRoleBranchRow[])
      : null;

  if (rolesFromRpc !== null && permissionsFromRpc !== null && branchesFromUser !== null) {
    return {
      roles: rolesFromRpc,
      permissions: permissionsFromRpc,
      roleBranches: branchesFromUser,
    };
  }

  if (!hasServiceRoleKey()) {
    return {
      roles: rolesFromRpc ?? [],
      permissions: permissionsFromRpc ?? [],
      roleBranches: branchesFromUser ?? [],
    };
  }

  const admin = createServiceRoleClient();
  const { data: roleRows, error: roleError } = await admin
    .from("user_roles")
    .select("branch_id, role_id, roles(key)")
    .eq("user_id", userId);

  if (roleError || !roleRows) {
    return {
      roles: rolesFromRpc ?? [],
      permissions: permissionsFromRpc ?? [],
      roleBranches: branchesFromUser ?? [],
    };
  }

  const typedRows = roleRows as unknown as RoleJoinRow[];
  const roles = Array.from(
    new Set(
      typedRows
        .map((row) => roleKeyFromJoin(row.roles))
        .filter((key): key is string => typeof key === "string" && key.length > 0),
    ),
  );
  const roleBranches: UserRoleBranchRow[] = typedRows.map((row) => ({
    branch_id: row.branch_id,
  }));

  if (roles.includes("super_admin")) {
    return { roles, permissions: [], roleBranches };
  }

  const roleIds = Array.from(new Set(typedRows.map((row) => row.role_id)));
  if (roleIds.length === 0) {
    return { roles, permissions: [], roleBranches };
  }

  const { data: permissionRows } = await admin
    .from("role_permissions")
    .select("permissions(key)")
    .in("role_id", roleIds);

  const permissions = Array.from(
    new Set(
      ((permissionRows ?? []) as unknown as PermissionJoinRow[])
        .map((row) => permissionKeyFromJoin(row.permissions))
        .filter((key): key is string => typeof key === "string" && key.length > 0)
        .filter(isPermission),
    ),
  );

  return { roles, permissions, roleBranches };
}

function mapStatus(status: ProfileRow["status"]): UserStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "invited":
      return "INVITED";
    case "suspended":
      return "SUSPENDED";
    case "disabled":
      return "DISABLED";
  }
}

function deriveBranchScope(
  roleBranches: UserRoleBranchRow[],
  homeBranchId: string | null,
): { accessibleBranchIds: string[]; branchScope: BranchAccessScope } {
  const hasGlobal = roleBranches.some((row) => row.branch_id === null);
  if (hasGlobal) {
    return { accessibleBranchIds: [], branchScope: "ALL_BRANCHES" };
  }

  const branches = Array.from(
    new Set(
      roleBranches
        .map((row) => row.branch_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  if (branches.length > 0) {
    return { accessibleBranchIds: branches, branchScope: "ASSIGNED_BRANCHES" };
  }

  if (homeBranchId) {
    return { accessibleBranchIds: [homeBranchId], branchScope: "OWN_BRANCH" };
  }

  return { accessibleBranchIds: [], branchScope: "OWN_BRANCH" };
}

export async function getSessionUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Memoized per request: layouts, pages and helpers share one lookup. */
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const userId = claims.sub;
  const email = typeof claims.email === "string" ? claims.email : null;

  const [{ data: profile, error: profileError }, { roles, permissions, roleBranches }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, employee_code, phone, avatar_url, branch_id, status, deleted_at")
        .eq("id", userId)
        .maybeSingle(),
      loadRolesAndPermissions(userId, supabase),
    ]);

  if (profileError || !profile) return null;
  const profileRow = profile as ProfileRow;
  if (profileRow.deleted_at) return null;
  const { accessibleBranchIds, branchScope } = deriveBranchScope(
    roleBranches,
    profileRow.branch_id,
  );

  return {
    userId,
    profileId: profileRow.id,
    email,
    displayName: profileRow.display_name,
    employeeCode: profileRow.employee_code,
    phone: profileRow.phone,
    avatarUrl: profileRow.avatar_url,
    branchId: profileRow.branch_id,
    roles,
    permissions: permissions as Permission[],
    status: mapStatus(profileRow.status),
    accessibleBranchIds,
    branchScope,
  };
});

export async function requireUserContext(): Promise<UserContext> {
  const context = await getUserContext();
  if (!context) redirect("/login");

  if (context.status === "SUSPENDED" || context.status === "DISABLED") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return context;
}

export async function requirePermission(permission: Permission): Promise<UserContext> {
  const context = await requireUserContext();
  if (!context.permissions.includes(permission) && !context.roles.includes("super_admin")) {
    redirect("/unauthorized");
  }
  return context;
}
