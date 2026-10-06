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
import { postAuthJson } from "@/lib/auth/client";
import type { UserListItem } from "@/lib/users/service";
import { firstFieldErrors } from "@/lib/validation";
import { editUserFormSchema } from "@/lib/validation/user";

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
  onSuccess: () => void;
};

export function EditUserDialog({ user, open, onOpenChange, onSuccess }: Props) {
  const t = useTranslations("modules.users");
  const tRoot = useTranslations();
  const msg = (key: string) => tRoot(key as Parameters<typeof tRoot>[0]);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function validate(values: { email: string; firstName: string; lastName: string }) {
    const parsed = editUserFormSchema.safeParse(values);
    const errors = parsed.success ? {} : firstFieldErrors(parsed.error);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function update(field: "email" | "firstName" | "lastName", value: string) {
    const next = { email, firstName, lastName, [field]: value };
    if (field === "email") setEmail(value);
    if (field === "firstName") setFirstName(value);
    if (field === "lastName") setLastName(value);
    if (submitted) validate(next);
  }

  useEffect(() => {
    if (user) {
      setEmail(user.email ?? "");
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
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
    if (!validate({ email, firstName, lastName })) return;

    const updates: Record<string, string> = {};
    if (email.trim() !== user.email) updates.email = email.trim();
    if (firstName.trim() !== user.firstName) updates.firstName = firstName.trim();
    if (lastName.trim() !== user.lastName) updates.lastName = lastName.trim();

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
