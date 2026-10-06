import { createServiceRoleClient } from "@/lib/supabase/admin";

export type UserListItem = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  status: "active" | "invited" | "suspended" | "disabled";
  roles: { key: string; name: string }[];
  createdAt: string;
  lastSignInAt: string | null;
};

export async function listUsers(): Promise<UserListItem[]> {
  const admin = createServiceRoleClient();

  const [profilesResult, authUsersResult, roleAssignmentsResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, last_name, display_name, status, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("user_roles").select("user_id, roles(key, name)"),
  ]);

  const profiles = profilesResult.data ?? [];
  const authUsers = authUsersResult.data?.users ?? [];

  const emailMap = new Map(
    authUsers.map((u) => [u.id, { email: u.email ?? null, lastSignInAt: u.last_sign_in_at ?? null }]),
  );

  const rolesByUser = new Map<string, { key: string; name: string }[]>();
  for (const row of roleAssignmentsResult.data ?? []) {
    const roleData = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    if (!roleData) continue;
    const userId = (row as { user_id: string }).user_id;
    const existing = rolesByUser.get(userId) ?? [];
    rolesByUser.set(userId, [...existing, { key: roleData.key, name: roleData.name }]);
  }

  return profiles.map((p) => ({
    id: p.id,
    email: emailMap.get(p.id)?.email ?? null,
    firstName: (p as { first_name: string | null }).first_name,
    lastName: (p as { last_name: string | null }).last_name,
    displayName: p.display_name,
    status: p.status as UserListItem["status"],
    roles: rolesByUser.get(p.id) ?? [],
    createdAt: p.created_at,
    lastSignInAt: emailMap.get(p.id)?.lastSignInAt ?? null,
  }));
}

export type RoleOption = { key: string; name: string };

export async function listRoles(): Promise<RoleOption[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin.from("roles").select("key, name").order("name");
  return (data ?? []).map((r) => ({ key: r.key, name: r.name }));
}
