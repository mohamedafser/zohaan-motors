"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheckIcon,
  CalendarCheckIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";

import { CancelBookingDialog, MarkSoldDialog } from "@/components/bookings/booking-action-dialogs";
import { EditBookingDialog } from "@/components/bookings/edit-booking-dialog";
import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResponsiveTable } from "@/components/tables/responsive-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import type { AppLocale } from "@/config/app";
import type { BookingListItem } from "@/lib/bookings/service";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { formatUaePhone } from "@/lib/utils/phone";
import { vehicleHref } from "@/lib/vehicles/routes";

type Filter = "active" | "sold" | "closed" | "all";

const inFilter = (b: BookingListItem, filter: Filter) =>
  filter === "all" ||
  (filter === "active" && b.status === "active") ||
  (filter === "sold" && b.status === "converted") ||
  (filter === "closed" && (b.status === "cancelled" || b.status === "expired"));

export function BookingsPageClient({
  initialBookings,
  canCreate,
  canCreateCustomer,
  ownOnly = false,
}: {
  initialBookings: BookingListItem[];
  canCreate: boolean;
  canCreateCustomer: boolean;
  /** Everyone but Super Admins and Accountants sees only their own bookings ("My bookings"). */
  ownOnly?: boolean;
}) {
  const t = useTranslations("bookings");
  const locale = useLocale() as AppLocale;
  const searchParams = useSearchParams();
  const initialVehicleId = searchParams.get("vehicleId") ?? undefined;

  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(
    canCreate && (Boolean(initialVehicleId) || searchParams.get("new") === "1"),
  );
  // Remounts the dialog on every open so it starts with a fresh form.
  const [dialogKey, setDialogKey] = useState(0);
  const openDialog = () => {
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  // One booking at a time is acted on; the open dialog is derived from `action`.
  const [selected, setSelected] = useState<BookingListItem | null>(null);
  const [action, setAction] = useState<"edit" | "sold" | "cancel" | null>(null);
  const openAction = (booking: BookingListItem, next: "edit" | "sold" | "cancel") => {
    setSelected(booking);
    setAction(next);
  };
  const dialogProps = (kind: "edit" | "sold" | "cancel") => ({
    open: action === kind,
    onOpenChange: (open: boolean) => {
      if (!open) setAction(null);
    },
  });

  const refresh = useCallback(async () => {
    const res = await fetch("/api/bookings", { credentials: "same-origin" });
    const json = await res.json().catch(() => null);
    if (json?.status === "success") setBookings(json.data);
  }, []);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        (["active", "sold", "closed", "all"] as const).map((key) => [
          key,
          bookings.filter((b) => inFilter(b, key)).length,
        ]),
      ) as Record<Filter, number>,
    [bookings],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "").replace(/^0/, "");
    return bookings.filter((b) => {
      if (!inFilter(b, filter)) return false;
      if (!q) return true;
      return (
        b.number.toLowerCase().includes(q) ||
        (b.vehicle?.title.toLowerCase().includes(q) ?? false) ||
        (b.vehicle?.stockNumber?.toLowerCase().includes(q) ?? false) ||
        (b.customer?.name.toLowerCase().includes(q) ?? false) ||
        (digits.length >= 3 && (b.customer?.phone.replace(/\D/g, "").includes(digits) ?? false))
      );
    });
  }, [bookings, filter, query]);

  const money = (value: number, b: BookingListItem) => formatCurrency(value, locale, b.currency);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(ownOnly ? "myTitle" : "title")}
        description={t(ownOnly ? "myDescription" : "description")}
        actions={
          canCreate ? (
            <Button variant="brand" onClick={openDialog}>
              <PlusIcon />
              {t("new")}
            </Button>
          ) : null
        }
      />

      <div className="animate-rise flex flex-col gap-3 [animation-delay:120ms] md:flex-row md:items-center md:justify-between">
        <div className="bg-muted flex w-full overflow-x-auto rounded-lg p-0.5 text-sm md:w-fit" role="tablist">
          {(["active", "sold", "closed", "all"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 whitespace-nowrap transition-all duration-200 md:flex-none",
                filter === key
                  ? "bg-background font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`filters.${key}`)}{" "}
              <span className="text-muted-foreground tabular-nums">({formatNumber(counts[key], locale)})</span>
            </button>
          ))}
        </div>
        <InputGroup className="bg-card h-10 md:h-9 md:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={() => setQuery("")} aria-label={t("clearSearch")}>
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={CalendarCheckIcon}
          title={query ? t("noMatches") : t("empty")}
          action={
            canCreate && !query && filter === "active" ? (
              <Button variant="brand" onClick={openDialog}>
                <PlusIcon />
                {t("new")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ResponsiveTable
          rows={visible}
          columns={[
            {
              key: "booking",
              header: t("number"),
              cell: (b) => (
                <div className="grid gap-0.5 whitespace-nowrap">
                  <span className="font-mono text-xs font-medium">{b.number}</span>
                  <span className="text-muted-foreground text-xs">{formatDate(b.reservedAt, locale)}</span>
                </div>
              ),
              className: "ps-4",
            },
            { key: "vehicle", header: t("vehicle"), cell: (b) => <VehicleCell booking={b} /> },
            { key: "customer", header: t("customer"), cell: (b) => <CustomerCell booking={b} /> },
            {
              key: "salesperson",
              header: t("salesperson"),
              cell: (b) => <span className="whitespace-nowrap">{b.salesperson?.name ?? "—"}</span>,
              className: "hidden xl:table-cell",
            },
            {
              key: "payment",
              header: t("payment.title"),
              cell: (b) => <PaymentSummary booking={b} money={money} />,
            },
            {
              key: "status",
              header: t("status"),
              cell: (b) => <StatusBadge status={`booking_${b.status}`} label={t(`statuses.${b.status}`)} />,
            },
            {
              key: "actions",
              header: "",
              cell: (b) => <BookingActions booking={b} onAction={openAction} />,
              className: "pe-4 text-end",
            },
          ]}
          renderCard={(b) => (
            <article key={b.id} className="bg-card grid min-w-0 gap-3 rounded-xl border p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                  <span className="font-mono text-xs font-medium">{b.number}</span>
                  <span className="text-muted-foreground text-xs">{formatDate(b.reservedAt, locale)}</span>
                </div>
                <StatusBadge status={`booking_${b.status}`} label={t(`statuses.${b.status}`)} />
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <VehicleCell booking={b} />
                <CustomerCell booking={b} />
              </div>
              <div className="bg-muted/50 rounded-lg px-3 py-2.5">
                <PaymentSummary booking={b} money={money} wide />
              </div>
              {b.salesperson ? (
                <p className="text-muted-foreground text-xs">
                  {t("salesperson")}: <span className="text-foreground">{b.salesperson.name}</span>
                </p>
              ) : null}
              <BookingActions booking={b} onAction={openAction} wide />
            </article>
          )}
        />
      )}

      <EditBookingDialog booking={selected} onSaved={refresh} {...dialogProps("edit")} />
      <MarkSoldDialog booking={selected} onDone={refresh} {...dialogProps("sold")} />
      <CancelBookingDialog booking={selected} onDone={refresh} {...dialogProps("cancel")} />

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

function VehicleCell({ booking }: { booking: BookingListItem }) {
  const t = useTranslations("bookings");
  const vehicle = booking.vehicle;
  if (!vehicle) return <span className="text-muted-foreground">—</span>;
  return (
    <Link
      href={vehicle.stockNumber ? vehicleHref(vehicle.stockNumber) : `/inventory/${vehicle.id}`}
      className="group/vehicle grid min-w-0 gap-0.5"
    >
      <span className="group-hover/vehicle:text-brand truncate font-medium transition-colors">{vehicle.title}</span>
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {vehicle.stockNumber ? <span className="font-mono">{vehicle.stockNumber}</span> : null}
        {booking.units > 1 ? (
          <span className="bg-brand-soft text-brand rounded-full px-1.5 py-px font-medium">
            {t("unitsBadge", { count: booking.units })}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function CustomerCell({ booking }: { booking: BookingListItem }) {
  const customer = booking.customer;
  if (!customer) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="grid min-w-0 gap-0.5">
      <span className="truncate font-medium">{customer.name}</span>
      <a
        href={`tel:${customer.phone}`}
        dir="ltr"
        className="text-muted-foreground hover:text-brand w-fit text-xs whitespace-nowrap tabular-nums transition-colors rtl:justify-self-end"
      >
        {formatUaePhone(customer.phone)}
      </a>
    </div>
  );
}

/** Price, deposit and what's left to collect (or what was collected, once sold). */
function PaymentSummary({
  booking: b,
  money,
  wide = false,
}: {
  booking: BookingListItem;
  money: (value: number, b: BookingListItem) => string;
  wide?: boolean;
}) {
  const t = useTranslations("bookings");
  const sold = b.status === "converted";
  const outstanding =
    sold && b.balanceDue != null && b.balanceReceived != null
      ? Math.round((b.balanceDue - b.balanceReceived) * 100) / 100
      : null;

  const lines: { label: string; value: string; tone?: string }[] = [
    { label: t("payment.price"), value: b.totalPrice == null ? "—" : money(b.totalPrice, b) },
    { label: t("payment.deposit"), value: money(b.deposit, b) },
  ];
  if (sold) {
    lines.push({
      label: t("payment.balanceReceived"),
      value: b.balanceReceived == null ? "—" : money(b.balanceReceived, b),
      tone: "text-emerald-700 dark:text-emerald-300",
    });
    if (outstanding != null && outstanding > 0) {
      lines.push({
        label: t("payment.outstanding"),
        value: money(outstanding, b),
        tone: "text-amber-700 dark:text-amber-300",
      });
    }
  } else if (b.status === "active" && b.balanceDue != null) {
    lines.push({ label: t("payment.balanceDue"), value: money(b.balanceDue, b), tone: "font-semibold" });
  }

  return (
    <dl className={cn("grid gap-0.5 text-xs", wide ? "w-full" : "min-w-44")}>
      {lines.map((line) => (
        <div key={line.label} className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{line.label}</dt>
          <dd className={cn("text-foreground tabular-nums whitespace-nowrap", line.tone)}>{line.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BookingActions({
  booking: b,
  onAction,
  wide = false,
}: {
  booking: BookingListItem;
  onAction: (booking: BookingListItem, action: "edit" | "sold" | "cancel") => void;
  wide?: boolean;
}) {
  const t = useTranslations("bookings");
  const hasMenu = b.can.edit || b.can.cancel;
  if (!b.can.sell && !hasMenu) return null;

  return (
    <div className={cn("flex items-center gap-1.5", wide ? "border-t pt-3" : "justify-end")} data-row-stop>
      {b.can.sell ? (
        <Button
          size={wide ? "default" : "sm"}
          variant="outline"
          className={cn(
            "hover:border-brand/50 hover:bg-brand-soft whitespace-nowrap",
            wide && "flex-1",
          )}
          onClick={() => onAction(b, "sold")}
        >
          <BadgeCheckIcon className="text-brand" />
          {t("markSold")}
        </Button>
      ) : null}
      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size={wide ? "icon" : "icon-sm"}
                aria-label={t("moreActions", { number: b.number })}
                className={wide ? "border" : undefined}
              />
            }
          >
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {b.can.edit ? (
              <DropdownMenuItem onClick={() => onAction(b, "edit")}>
                <PencilIcon />
                {t("editAction")}
              </DropdownMenuItem>
            ) : null}
            {b.can.edit && b.can.cancel ? <DropdownMenuSeparator /> : null}
            {b.can.cancel ? (
              <DropdownMenuItem variant="destructive" onClick={() => onAction(b, "cancel")}>
                <XCircleIcon />
                {t("cancelAction")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
