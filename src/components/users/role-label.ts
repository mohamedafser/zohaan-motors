// Roles with a translated label; everything else shows the name stored in the roles table.
const translatedRoleKeys = ["super_admin", "viewer"];

export function roleLabel(
  role: { key: string; name: string },
  t: (key: string) => string,
) {
  return translatedRoleKeys.includes(role.key) ? t(`roleNames.${role.key}`) : role.name;
}
