"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { BookingListItem } from "@/lib/bookings/service";
import { firstFieldErrors } from "@/lib/validation";
import { editBookingSchema } from "@/lib/validation/booking";

const toNumber = (value: string) => (value === "" ? Number.NaN : Number(value));

function EditBookingForm({
  booking,
  onDone,
  onSaved,
}: {
  booking: BookingListItem;
  onDone: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("bookings");
  const tRoot = useTranslations();
  const msg = (key: string) => tRoot(key as Parameters<typeof tRoot>[0]);

  const [form, setForm] = useState({
    deposit: String(booking.deposit),
    sellingPrice: booking.sellingPrice == null ? "" : String(booking.sellingPrice),
    notes: booking.notes ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const payload = (values: typeof form) => ({
    deposit: toNumber(values.deposit),
    sellingPrice: toNumber(values.sellingPrice),
    notes: values.notes,
  });

  function set(key: keyof typeof form, value: string) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (Object.keys(fieldErrors).length > 0) {
      const parsed = editBookingSchema.safeParse(payload(next));
      setFieldErrors(parsed.success ? {} : firstFieldErrors(parsed.error));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = editBookingSchema.safeParse(payload(form));
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error));
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action: "edit", ...parsed.data }),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);

    if (json?.status !== "success") {
      if (json?.fieldErrors && Object.keys(json.fieldErrors).length > 0) setFieldErrors(json.fieldErrors);
      else setFormError(json?.message ?? t("errors.actionFailed"));
      return;
    }
    toast.success(t("updated"));
    onDone();
    onSaved();
  }

  const error = (key: string) =>
    fieldErrors[key] ? <p className="text-destructive text-xs">{msg(fieldErrors[key])}</p> : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-booking-deposit">{t("deposit")}</Label>
          <Input
            id="edit-booking-deposit"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.deposit}
            onChange={(e) => set("deposit", e.target.value)}
            aria-invalid={!!fieldErrors.deposit || undefined}
          />
          {error("deposit")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-booking-selling-price">{t("sellingPrice")}</Label>
          <Input
            id="edit-booking-selling-price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.sellingPrice}
            onChange={(e) => set("sellingPrice", e.target.value)}
            aria-invalid={!!fieldErrors.sellingPrice || undefined}
            aria-required
          />
          {error("sellingPrice")}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-booking-notes">{t("notes")}</Label>
        <Textarea
          id="edit-booking-notes"
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {formError ? <p className="text-destructive text-sm">{formError}</p> : null}

      <DialogFooter showCloseButton>
        <Button type="submit" disabled={saving}>
          {tRoot("common.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditBookingDialog({
  booking,
  open,
  onOpenChange,
  onSaved,
}: {
  booking: BookingListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("bookings");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>
            {booking ? `${booking.number}${booking.vehicle ? ` · ${booking.vehicle.title}` : ""}` : null}
          </DialogDescription>
        </DialogHeader>
        {/* Keyed so reopening for another booking starts from its saved values. */}
        {booking && open ? (
          <EditBookingForm key={booking.id} booking={booking} onDone={() => onOpenChange(false)} onSaved={onSaved} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
