"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleLabel } from "@/components/users/role-label";
import { RoleChip } from "@/components/users/role-chip";
import type { RoleOption, UserListItem } from "@/lib/users/service";
import { firstFieldErrors } from "@/lib/validation";
import { editableUserStatuses, editUserFormSchema } from "@/lib/validation/user";

type Status = UserListItem["status"];
type FormValues = { email: string; firstName: string; lastName: string; roleKey: string; status: Status };

const STATUS_LABEL_KEY: Record<Status, string> = {
  active: "statusActive",
  invited: "statusInvited",
  suspended: "statusSuspended",
  disabled: "statusDisabled",
};

async function patchUser(id: string, body: Record<string, string>) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ status: "error", formError: "auth.errors.generic", fieldErrors: {}, redirectTo: null, details: null }));
}

type Props = {
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOption[];
  onSuccess: () => void;
};

export function EditUserDialog({ user, open, onOpenChange, roles, onSuccess }: Props) {
  const t = useTranslations("modules.users");
  const tRoot = useTranslations();
  const msg = (key: string) => tRoot(key as Parameters<typeof tRoot>[0]);
  const label = (role: RoleOption) => roleLabel(role, (k) => t(k as Parameters<typeof t>[0]));
  const statusLabel = (status: Status) => t(STATUS_LABEL_KEY[status] as Parameters<typeof t>[0]);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function validate(values: FormValues) {
    const parsed = editUserFormSchema.safeParse(values);
    const errors = parsed.success ? {} : firstFieldErrors(parsed.error);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    const next = { email, firstName, lastName, roleKey, status, [field]: value };
    if (field === "email") setEmail(value as string);
    if (field === "firstName") setFirstName(value as string);
    if (field === "lastName") setLastName(value as string);
    if (field === "roleKey") setRoleKey(value as string);
    if (field === "status") setStatus(value as Status);
    if (submitted) validate(next);
  }

  useEffect(() => {
    if (user) {
      setEmail(user.email ?? "");
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setRoleKey(user.roles[0]?.key ?? "");
      setStatus(user.status);
      setFieldErrors({});
      setFormError(null);
      setSubmitted(false);
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitted(true);
    setFormError(null);
    if (!validate({ email, firstName, lastName, roleKey, status })) return;

    const updates: Record<string, string> = {};
    if (email.trim() !== user.email) updates.email = email.trim();
    if (firstName.trim() !== user.firstName) updates.firstName = firstName.trim();
    if (lastName.trim() !== user.lastName) updates.lastName = lastName.trim();
    if (user.roles.length !== 1 || user.roles[0].key !== roleKey) updates.roleKey = roleKey;
    if (status !== user.status) updates.status = status;

    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    setLoading(true);

    const result = await patchUser(user.id, updates);
    setLoading(false);

    if (result.status === "error") {
      if (Object.keys(result.fieldErrors ?? {}).length > 0) {
        setFieldErrors(result.fieldErrors);
      } else {
        setFormError(result.formError);
      }
      return;
    }

    toast.success(t("editSuccess"));
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>{user?.displayName}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-first-name">{t("firstName")}</Label>
                <Input
                  id="edit-first-name"
                  value={firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  disabled={loading}
                  aria-invalid={!!fieldErrors.firstName || undefined}
                />
                {fieldErrors.firstName && (
                  <p className="text-destructive text-xs">{msg(fieldErrors.firstName)}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-last-name">{t("lastName")}</Label>
                <Input
                  id="edit-last-name"
                  value={lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  disabled={loading}
                  aria-invalid={!!fieldErrors.lastName || undefined}
                />
                {fieldErrors.lastName && (
                  <p className="text-destructive text-xs">{msg(fieldErrors.lastName)}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">{t("email")}</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => update("email", e.target.value)}
                disabled={loading}
                aria-invalid={!!fieldErrors.email || undefined}
              />
              {fieldErrors.email && (
                <p className="text-destructive text-xs">{msg(fieldErrors.email)}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-role">{t("role")}</Label>
                <Select value={roleKey} onValueChange={(v) => update("roleKey", v ?? "")} disabled={loading}>
                  <SelectTrigger id="edit-role" className="w-full" aria-invalid={!!fieldErrors.roleKey || undefined}>
                    <SelectValue placeholder={t("role")}>
                      {(value: string | null) => {
                        const role = roles.find((r) => r.key === value);
                        return role ? <RoleChip label={label(role)} /> : t("role");
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.key} value={role.key}>
                        <RoleChip label={label(role)} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.roleKey && (
                  <p className="text-destructive text-xs">{msg(fieldErrors.roleKey)}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-status">{t("status")}</Label>
                <Select
                  value={status}
                  onValueChange={(v) => v && update("status", v as Status)}
                  disabled={loading || user?.status === "invited"}
                >
                  <SelectTrigger id="edit-status" className="w-full" aria-invalid={!!fieldErrors.status || undefined}>
                    <SelectValue>{(value: Status | null) => (value ? statusLabel(value) : t("status"))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {user?.status === "invited" && (
                      <SelectItem value="invited">{statusLabel("invited")}</SelectItem>
                    )}
                    {editableUserStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {user?.status === "invited" && !fieldErrors.status && (
                  <p className="text-muted-foreground text-xs">{t("invitedStatusHint")}</p>
                )}
                {fieldErrors.status && (
                  <p className="text-destructive text-xs">{msg(fieldErrors.status)}</p>
                )}
              </div>
            </div>

            {formError && <p className="text-destructive text-sm">{msg(formError)}</p>}
          </div>

          <DialogFooter className="mt-6" showCloseButton>
            <Button type="submit" disabled={loading}>
              {msg("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
