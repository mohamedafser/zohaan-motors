"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
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
import { PhoneInput } from "@/components/forms/phone-input";
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
import { emirates } from "@/lib/validation/branch";

const emptyForm = {
  name: "",
  code: "",
  emirate: "",
  city: "",
  addressLine1: "",
  phone: "",
  email: "",
};

type FormKey = keyof typeof emptyForm;

export function CreateBranchDialog({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("modules.branches");
  const tRoot = useTranslations();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const msg = (key: string) => tRoot(key as Parameters<typeof tRoot>[0]);

  function set(key: FormKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm(emptyForm);
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setFormError(null);

    const result = await postAuthJson("/api/branches", form);
    setLoading(false);

    if (result.status === "error") {
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
      return;
    }

    toast.success(t("createSuccess"));
    setOpen(false);
    reset();
    onSuccess();
  }

  function field(key: FormKey, label: string, props: React.ComponentProps<"input"> = {}) {
    const id = `branch-${key}`;
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          aria-invalid={!!fieldErrors[key] || undefined}
          disabled={loading}
          {...props}
        />
        {fieldErrors[key] && <p className="text-destructive text-xs">{msg(fieldErrors[key])}</p>}
      </div>
    );
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
        <PlusIcon />
        {t("create")}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              {field("name", t("name"))}
              {field("code", t("code"), { placeholder: "DXB-02", className: "uppercase" })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branch-emirate">{t("emirate")}</Label>
                <Select
                  value={form.emirate}
                  onValueChange={(v) => set("emirate", v ?? "")}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="branch-emirate"
                    className="w-full"
                    aria-invalid={!!fieldErrors.emirate || undefined}
                  >
                    <SelectValue placeholder={t("emirate")}>
                      {(value: string | null) =>
                        value ? t(`emirates.${value}` as Parameters<typeof t>[0]) : t("emirate")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {emirates.map((e) => (
                      <SelectItem key={e} value={e}>
                        {t(`emirates.${e}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.emirate && (
                  <p className="text-destructive text-xs">{msg(fieldErrors.emirate)}</p>
                )}
              </div>
              {field("city", t("city"))}
            </div>

            {field("addressLine1", t("address"))}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branch-phone">{t("phone")}</Label>
                <PhoneInput
                  id="branch-phone"
                  value={form.phone}
                  onChange={(value) => set("phone", value)}
                  disabled={loading}
                  invalid={!!fieldErrors.phone}
                />
                {fieldErrors.phone && (
                  <p className="text-destructive text-xs">{msg(fieldErrors.phone)}</p>
                )}
              </div>
              {field("email", t("email"), { type: "email" })}
            </div>

            {formError && <p className="text-destructive text-sm">{msg(formError)}</p>}
          </div>

          <DialogFooter className="mt-6" showCloseButton>
            <Button type="submit" disabled={loading}>
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
