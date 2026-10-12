"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { BadgeCheckIcon, CalendarCheckIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/config/app";
import type { BookingListItem } from "@/lib/bookings/service";
import { Link } from "@/lib/i18n/navigation";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

type Filter = "active" | "all";

export function BookingsPageClient({
  initialBookings,
  canCreate,
  canCancel,
  canSell,
  canCreateCustomer,
}: {
  initialBookings: BookingListItem[];
  canCreate: boolean;
  canCancel: boolean;
  canSell: boolean;
  canCreateCustomer: boolean;
}) {
  const t = useTranslations("bookings");
  const locale = useLocale() as AppLocale;
  const searchParams = useSearchParams();
  const initialVehicleId = searchParams.get("vehicleId") ?? undefined;

  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<Filter>("active");
  const [dialogOpen, setDialogOpen] = useState(
    canCreate && (Boolean(initialVehicleId) || searchParams.get("new") === "1"),
  );
  // Remounts the dialog on every open so it starts with a fresh form.
  const [dialogKey, setDialogKey] = useState(0);
  const openDialog = () => {
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };
  const [confirm, setConfirm] = useState<{ id: string; action: "cancel" | "sold" } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/bookings", { credentials: "same-origin" });
    const json = await res.json().catch(() => null);
    if (json?.status === "success") setBookings(json.data);
  }, []);

  async function runAction(id: string, action: "cancel" | "sold") {
    setBusy(true);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    setConfirm(null);
    if (json?.status === "success") {
      toast.success(t(action === "cancel" ? "cancelled" : "markedSold"));
      await refresh();
    } else {
      toast.error(json?.message ?? t("errors.actionFailed"));
    }
  }

  const visible = useMemo(
    () => (filter === "active" ? bookings.filter((b) => b.status === "active") : bookings),
    [bookings, filter],
  );
  const activeCount = bookings.filter((b) => b.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate ? (
            <Button onClick={openDialog}>
              <PlusIcon />
              {t("new")}
            </Button>
          ) : null
        }
      />

      <div className="bg-muted inline-flex w-fit rounded-lg p-0.5 text-sm" role="tablist">
        {(["active", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? "bg-background rounded-md px-3 py-1 font-medium shadow-xs"
                : "text-muted-foreground px-3 py-1"
            }
          >
            {key === "active" ? `${t("filterActive")} (${activeCount})` : t("filterAll")}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <CalendarCheckIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="px-4 py-3 text-start font-medium">{t("number")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("vehicle")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("customer")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("salesperson")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("deposit")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("expiresOn")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((b) => (
                <tr key={b.id} className="bg-card">
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{b.number}</td>
                  <td className="px-4 py-3">
                    {b.vehicle ? (
                      <Link href={`/inventory/${b.vehicle.id}`} className="hover:underline">
                        <span className="font-medium">{b.vehicle.title}</span>
                        {b.vehicle.stockNumber ? (
                          <span className="text-muted-foreground block text-xs">{b.vehicle.stockNumber}</span>
                        ) : null}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {b.customer ? (
                      <>
                        <span className="font-medium">{b.customer.name}</span>
                        <span className="text-muted-foreground block text-xs" dir="ltr">
                          {b.customer.phone}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{b.salesperson?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-end tabular-nums whitespace-nowrap">
                    {formatCurrency(b.deposit, locale, b.currency)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(b.expiresAt, locale, "short")}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={`booking_${b.status}`} label={t(`statuses.${b.status}`)} />
                  </td>
                  <td className="px-4 py-3">
                    {b.status === "active" && (canSell || canCancel) ? (
                      confirm?.id === b.id ? (
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <span className="text-xs font-medium">
                            {t(confirm.action === "cancel" ? "confirmCancel" : "confirmSold")}
                          </span>
                          <Button
                            size="sm"
                            variant={confirm.action === "cancel" ? "destructive" : "default"}
                            disabled={busy}
                            onClick={() => runAction(b.id, confirm.action)}
                          >
                            {t("yes")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                            {t("no")}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {canSell ? (
                            <Button size="sm" variant="outline" onClick={() => setConfirm({ id: b.id, action: "sold" })}>
                              <BadgeCheckIcon />
                              {t("markSold")}
                            </Button>
                          ) : null}
                          {canCancel ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirm({ id: b.id, action: "cancel" })}
                            >
                              <XIcon />
                              {t("cancel")}
                            </Button>
                          ) : null}
                        </div>
                      )
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canCreate ? (
        <NewBookingDialog
          key={dialogKey}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialVehicleId={initialVehicleId}
          canCreateCustomer={canCreateCustomer}
          onCreated={refresh}
        />
      ) : null}
    </div>
  );
}
