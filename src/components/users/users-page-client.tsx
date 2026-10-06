"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { PageHeader } from "@/components/layout/page-header";
import type { RoleOption, UserListItem } from "@/lib/users/service";
import { roleLabel } from "@/components/users/role-label";
import type { AppLocale } from "@/config/app";
import { formatDate } from "@/lib/utils/date";

const STATUS_LABEL_KEY: Record<string, string> = {
  active: "statusActive",
  invited: "statusInvited",
  suspended: "statusSuspended",
  disabled: "statusDisabled",
};

function UserInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </span>
  );
}

type Props = {
  initialUsers: UserListItem[];
  roles: RoleOption[];
};


export function UsersPageClient({ initialUsers, roles }: Props) {
  const t = useTranslations("modules.users");
  const locale = useLocale() as AppLocale;
  const [users, setUsers] = useState(initialUsers);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/users", { credentials: "same-origin" });
    if (res.ok) {
      const data: UserListItem[] = await res.json();
      setUsers(data);
    }
  }, []);

  async function handleRemove(user: UserListItem) {
    if (!confirm(`Remove ${user.displayName}? This cannot be undone.`)) return;

    const res = await fetch(`/api/users/${user.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    if (res.ok) {
      toast.success(t("removeSuccess"));
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      toast.error(t("errors.removeFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<InviteUserDialog roles={roles} onSuccess={refresh} />}
      />

      {users.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noUsers")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("email")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("role")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("status")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("joined")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserInitials name={user.displayName} />
                      <span className="font-medium">{user.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0
                        ? user.roles.map((r) => (
                            <span
                              key={r.key}
                              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                            >
                              {roleLabel(r, (k) => t(k as Parameters<typeof t>[0]))}
                            </span>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={user.status}
                      label={t(STATUS_LABEL_KEY[user.status] as Parameters<typeof t>[0])}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(user.createdAt, locale, "short")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setEditUser(user); setEditOpen(true); }}
                        aria-label="Edit user"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(user)}
                        aria-label="Remove user"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditUserDialog
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={refresh}
      />
    </div>
  );
}
