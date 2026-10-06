"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { postAuthJson } from "@/lib/auth/client";
import { firstFieldErrors } from "@/lib/validation";
import { inviteUserSchema } from "@/lib/validation/user";
import type { RoleOption } from "@/lib/users/service";
import { roleLabel } from "@/components/users/role-label";

export function InviteUserDialog({
  roles,
  onSuccess,
}: {
  roles: RoleOption[];
  onSuccess: () => void;
}) {
  const t = useTranslations("modules.users");
  const tRoot = useTranslations();
  const msg = (key: string) => tRoot(key as Parameters<typeof tRoot>[0]);
  const label = (role: RoleOption) => roleLabel(role, (k) => t(k as Parameters<typeof t>[0]));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function validate(values: { email: string; firstName: string; lastName: string; roleKey: string }) {
    const parsed = inviteUserSchema.safeParse(values);
    const errors = parsed.success ? {} : firstFieldErrors(parsed.error);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function update(field: "email" | "firstName" | "lastName" | "roleKey", value: string) {
    const next = { email, firstName, lastName, roleKey, [field]: value };
    if (field === "email") setEmail(value);
    if (field === "firstName") setFirstName(value);
    if (field === "lastName") setLastName(value);
    if (field === "roleKey") setRoleKey(value);
    if (submitted) validate(next);
  }

  function reset() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRoleKey("");
    setSubmitted(false);
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (!validate({ email, firstName, lastName, roleKey })) return;

    setLoading(true);
    const result = await postAuthJson("/api/users/invite", { email, firstName, lastName, roleKey });

    setLoading(false);

    if (result.status === "error") {
      if (Object.keys(result.fieldErrors).length > 0) {
        setFieldErrors(result.fieldErrors);
      } else {
        setFormError(result.formError);
      }
      return;
    }

    toast.success(t("inviteSuccess"));
    setOpen(false);
    reset();
    onSuccess();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlusIcon />
        {t("invite")}
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("inviteTitle")}</DialogTitle>
            <DialogDescription>{t("inviteDescription")}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-first-name">{t("firstName")}</Label>
                <Input
                  id="invite-first-name"
                  value={firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  autoComplete="given-name"
                  aria-invalid={!!fieldErrors.firstName || undefined}
                  disabled={loading}
                />
                {fieldErrors.firstName && (
                  <p className="text-destructive text-xs">{msg(fieldErrors.firstName)}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-last-name">{t("lastName")}</Label>
                <Input
                  id="invite-last-name"
                  value={lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  autoComplete="family-name"
                  aria-invalid={!!fieldErrors.lastName || undefined}
                  disabled={loading}
                />
                {fieldErrors.lastName && (
                  <p className="text-destructive text-xs">{msg(fieldErrors.lastName)}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">{t("email")}</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => update("email", e.target.value)}
                autoComplete="email"
                aria-invalid={!!fieldErrors.email || undefined}
                disabled={loading}
              />
              {fieldErrors.email && (
                <p className="text-destructive text-xs">{msg(fieldErrors.email)}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">{t("role")}</Label>
              <Select value={roleKey} onValueChange={(v) => update("roleKey", v ?? "")} disabled={loading}>
                <SelectTrigger id="invite-role" className="w-full" aria-invalid={!!fieldErrors.roleKey || undefined}>
                  <SelectValue placeholder={t("role")}>
                    {(value: string | null) => {
                      const role = roles.find((r) => r.key === value);
                      return role ? label(role) : t("role");
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.key} value={role.key}>
                      {label(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.roleKey && (
                <p className="text-destructive text-xs">{msg(fieldErrors.roleKey)}</p>
              )}
            </div>

            {formError && (
              <p className="text-destructive text-sm">{msg(formError)}</p>
            )}
          </div>

          <DialogFooter className="mt-6" showCloseButton>
            <Button type="submit" disabled={loading}>
              {t("invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
