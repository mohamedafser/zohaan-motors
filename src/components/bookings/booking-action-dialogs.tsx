"use client";

import { BadgeCheckIcon, CircleAlertIcon, CircleCheckIcon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/forms/currency-input";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/config/app";
import type { BookingListItem } from "@/lib/bookings/service";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";

type DialogProps = {
  booking: BookingListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

async function patchBooking(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/bookings/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => null)) as
    | { status: "success" }
    | { status: "error"; message?: string; fieldErrors?: Record<string, string> }
    | null;
}

function BookingSubject({ booking }: { booking: BookingListItem }) {
  return (
    <>
      <span className="font-mono">{booking.number}</span>
      {booking.vehicle ? ` · ${booking.vehicle.title}` : null}
      {booking.customer ? ` · ${booking.customer.name}` : null}
    </>
  );
}

function MarkSoldForm({ booking, onOpenChange, onDone }: DialogProps & { booking: BookingListItem }) {
  const t = useTranslations("bookings");
  const tRoot = useTranslations();
  const locale = useLocale() as AppLocale;
  const money = (value: number) => formatCurrency(value, locale, booking.currency);
  const due = booking.balanceDue;

  // Prefilled with the full balance: the usual case is the customer paying it all on handover.
  const [received, setReceived] = useState<number | null>(due ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const outstanding = due != null && received != null ? Math.round((due - received) * 100) / 100 : null;
  const tooMuch = outstanding != null && outstanding < 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (received == null || !Number.isFinite(received) || received < 0) {
      setError("validation.required");
      return;
    }
    if (tooMuch) {
      setError("bookings.errors.exceedsBalance");
      return;
    }
    setSaving(true);
    const json = await patchBooking(booking.id, { action: "sold", balanceReceived: received });
    setSaving(false);
    if (json?.status !== "success") {
      const fieldError = json?.status === "error" ? json.fieldErrors?.balanceReceived : undefined;
      if (fieldError) setError(fieldError);
      else toast.error((json?.status === "error" && json.message) || t("errors.actionFailed"));
      return;
    }
    toast.success(t("markedSold"));
    onOpenChange(false);
    onDone();
  }

  const rows: { label: string; value: string; strong?: boolean }[] = [
    {
      label: booking.units > 1 ? t("sold.totalUnits", { count: booking.units }) : t("sold.sellingPrice"),
      value: booking.totalPrice == null ? "—" : money(booking.totalPrice),
    },
    { label: t("sold.depositPaid"), value: `− ${money(booking.deposit)}` },
    { label: t("sold.balanceDue"), value: due == null ? "—" : money(due), strong: true },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <dl className="bg-muted/50 grid gap-2 rounded-xl border p-4 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between gap-3",
              row.strong && "mt-1 border-t pt-3 text-base font-semibold",
            )}
          >
            <dt className={row.strong ? undefined : "text-muted-foreground"}>{row.label}</dt>
            <dd className="tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="sold-balance-received">{t("sold.balanceReceived")}</Label>
          {due != null && received !== due ? (
            <button
              type="button"
              className="text-brand text-xs font-medium hover:underline"
              onClick={() => {
                setReceived(due);
                setError(null);
              }}
            >
              {t("sold.fillFull")}
            </button>
          ) : null}
        </div>
        <CurrencyInput
          id="sold-balance-received"
          autoFocus
          value={received}
          onChange={(value) => {
            setReceived(value);
            setError(null);
          }}
          invalid={!!error || tooMuch}
          describedBy="sold-balance-hint"
        />
        <div id="sold-balance-hint" aria-live="polite" className="min-h-5 text-xs">
          {error ? (
            <p className="text-destructive flex items-center gap-1.5">
              <CircleAlertIcon className="size-3.5" aria-hidden />
              {tRoot(error as Parameters<typeof tRoot>[0])}
            </p>
          ) : outstanding == null ? (
            <p className="text-muted-foreground">{t("sold.balanceHint")}</p>
          ) : outstanding === 0 ? (
            <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
              <CircleCheckIcon className="size-3.5" aria-hidden />
              {t("sold.paidInFull")}
            </p>
          ) : tooMuch ? (
            <p className="text-destructive flex items-center gap-1.5">
              <CircleAlertIcon className="size-3.5" aria-hidden />
              {t("errors.exceedsBalance")}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <CircleAlertIcon className="size-3.5" aria-hidden />
              {t("sold.outstanding", { amount: money(outstanding) })}
            </p>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">{t("sold.effect")}</p>

      <DialogFooter showCloseButton>
        <LoadingButton type="submit" variant="brand" loading={saving}>
          <BadgeCheckIcon />
          {t("sold.confirm")}
        </LoadingButton>
      </DialogFooter>
    </form>
  );
}

export function MarkSoldDialog(props: DialogProps) {
  const t = useTranslations("bookings");
  const { booking, open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sold.title")}</DialogTitle>
          <DialogDescription>{booking ? <BookingSubject booking={booking} /> : null}</DialogDescription>
        </DialogHeader>
        {/* Keyed so each booking opens with its own balance prefilled. */}
        {booking && open ? <MarkSoldForm key={booking.id} {...props} booking={booking} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CancelForm({ booking, onOpenChange, onDone }: DialogProps & { booking: BookingListItem }) {
  const t = useTranslations("bookings");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const json = await patchBooking(booking.id, { action: "cancel", reason: reason.trim() || undefined });
    setSaving(false);
    if (json?.status !== "success") {
      toast.error((json?.status === "error" && json.message) || t("errors.actionFailed"));
      return;
    }
    toast.success(t("cancelled"));
    onOpenChange(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t("cancelDialog.effect")}</p>
      <div className="grid gap-1.5">
        <Label htmlFor="cancel-booking-reason">{t("cancelDialog.reason")}</Label>
        <Textarea
          id="cancel-booking-reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("cancelDialog.reasonPlaceholder")}
        />
      </div>
      <DialogFooter showCloseButton>
        <LoadingButton type="submit" variant="destructive" loading={saving}>
          <XCircleIcon />
          {t("cancelDialog.confirm")}
        </LoadingButton>
      </DialogFooter>
    </form>
  );
}

export function CancelBookingDialog(props: DialogProps) {
  const t = useTranslations("bookings");
  const { booking, open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
          <DialogDescription>{booking ? <BookingSubject booking={booking} /> : null}</DialogDescription>
        </DialogHeader>
        {booking && open ? <CancelForm key={booking.id} {...props} booking={booking} /> : null}
      </DialogContent>
    </Dialog>
  );
}
