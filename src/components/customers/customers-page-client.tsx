"use client";

import {
  Building2Icon,
  CalendarCheckIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  UserPlusIcon,
  UserRoundXIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { KpiCard } from "@/components/cards/kpi-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { PageHeader } from "@/components/layout/page-header";
import { ResponsiveTable } from "@/components/tables/responsive-table";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import type { CustomerListItem } from "@/lib/customers/service";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/currency";
import { formatDate, formatRelativeTime } from "@/lib/utils/date";
import { formatUaePhone } from "@/lib/utils/phone";

type Filter = "all" | "active" | "none";

export function CustomersPageClient({
  customers,
  ownOnly,
  canCreateBooking,
}: {
  customers: CustomerListItem[];
  /** Roles that only see their own bookings also only see their own customers. */
  ownOnly: boolean;
  canCreateBooking: boolean;
}) {
  const t = useTranslations("customers");
  const locale = useAppLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      all: customers.length,
      active: customers.filter((c) => c.bookings.active > 0).length,
      none: customers.filter((c) => c.bookings.total === 0).length,
      newThisMonth: customers.filter((c) => new Date(c.createdAt) >= monthStart).length,
      unassigned: customers.filter((c) => !c.salesperson).length,
      bookings: customers.reduce((sum, c) => sum + c.bookings.total, 0),
    };
  }, [customers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Phone numbers are stored in E.164; compare digits so "050 123" matches "+97150123…".
    const digits = q.replace(/\D/g, "");
    return customers.filter((c) => {
      if (filter === "active" && c.bookings.active === 0) return false;
      if (filter === "none" && c.bookings.total > 0) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits.replace(/^0/, "")))
      );
    });
  }, [customers, filter, query]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(ownOnly ? "myTitle" : "title")}
        description={t(ownOnly ? "myDescription" : "description")}
        actions={
          canCreateBooking ? (
            <Button variant="brand" nativeButton={false} render={<Link href="/bookings?new=1" />}>
              <PlusIcon />
              {t("newBooking")}
            </Button>
          ) : null
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 [--stagger:80ms] lg:grid-cols-4 lg:gap-4">
        <KpiCard label={t("kpis.total")} value={formatNumber(counts.all, locale)} icon={UsersIcon} tone="brand" />
        <KpiCard
          label={t("kpis.active")}
          value={formatNumber(counts.active, locale)}
          icon={CalendarCheckIcon}
          tone="success"
        />
        <KpiCard
          label={t("kpis.new")}
          value={formatNumber(counts.newThisMonth, locale)}
          icon={UserPlusIcon}
          tone="info"
        />
        {ownOnly ? (
          <KpiCard
            label={t("kpis.bookings")}
            value={formatNumber(counts.bookings, locale)}
            icon={CalendarCheckIcon}
            tone="violet"
          />
        ) : (
          <KpiCard
            label={t("kpis.unassigned")}
            value={formatNumber(counts.unassigned, locale)}
            icon={UserRoundXIcon}
            tone={counts.unassigned > 0 ? "warning" : "neutral"}
          />
        )}
      </section>

      <div className="animate-rise flex flex-col gap-3 [animation-delay:200ms] md:flex-row md:items-center md:justify-between">
        <div className="bg-muted flex w-full overflow-x-auto rounded-lg p-0.5 text-sm md:w-fit" role="tablist">
          {(["all", "active", "none"] as const).map((key) => (
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
          icon={UsersIcon}
          title={customers.length === 0 ? t("empty") : t("noMatches")}
          description={customers.length === 0 ? t("emptyHint") : t("noMatchesHint")}
        />
      ) : (
        <ResponsiveTable
          rows={visible}
          columns={[
            {
              key: "customer",
              header: t("columns.customer"),
              cell: (c) => <CustomerName customer={c} />,
              className: "ps-4",
            },
            {
              key: "contact",
              header: t("columns.contact"),
              cell: (c) => (
                <div className="grid max-w-56 gap-0.5">
                  <a
                    href={`tel:${c.phone}`}
                    dir="ltr"
                    className="hover:text-brand w-fit whitespace-nowrap tabular-nums transition-colors rtl:justify-self-end"
                  >
                    {formatUaePhone(c.phone)}
                  </a>
                  {c.email ? (
                    <a
                      href={`mailto:${c.email}`}
                      title={c.email}
                      className="text-muted-foreground hover:text-brand truncate text-xs transition-colors"
                    >
                      {c.email}
                    </a>
                  ) : null}
                </div>
              ),
            },
            {
              key: "branch",
              header: t("columns.branch"),
              cell: (c) => <span className="block max-w-48 truncate">{c.branchName ?? "—"}</span>,
              className: "hidden xl:table-cell",
            },
            {
              key: "salesperson",
              header: t("columns.salesperson"),
              cell: (c) =>
                c.salesperson ? (
                  <span className="whitespace-nowrap">{c.salesperson.name}</span>
                ) : (
                  <span className="text-muted-foreground">{t("unassigned")}</span>
                ),
              className: "hidden lg:table-cell",
            },
            {
              key: "bookings",
              header: t("columns.bookings"),
              cell: (c) => <BookingsSummary customer={c} />,
            },
            {
              key: "added",
              header: t("columns.added"),
              cell: (c) => (
                <span className="text-muted-foreground whitespace-nowrap" title={formatDate(c.createdAt, locale)}>
                  {formatRelativeTime(c.createdAt, locale)}
                </span>
              ),
              className: "hidden text-end 2xl:table-cell",
            },
          ]}
          renderCard={(c) => (
            <article key={c.id} className="bg-card grid min-w-0 gap-3 overflow-hidden rounded-xl border p-4 shadow-xs">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <CustomerName customer={c} />
                <div className="shrink-0">
                  <BookingsSummary customer={c} stacked />
                </div>
              </div>
              <div className="text-muted-foreground grid gap-1.5 text-sm">
                <a href={`tel:${c.phone}`} className="hover:text-brand flex w-fit items-center gap-2">
                  <PhoneIcon className="size-3.5" aria-hidden />
                  <span dir="ltr" className="tabular-nums">
                    {formatUaePhone(c.phone)}
                  </span>
                </a>
                {c.email ? (
                  <a href={`mailto:${c.email}`} className="hover:text-brand flex min-w-0 items-center gap-2">
                    <MailIcon className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{c.email}</span>
                  </a>
                ) : null}
                {c.branchName ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2Icon className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{c.branchName}</span>
                  </span>
                ) : null}
              </div>
              <div className="text-muted-foreground flex items-center justify-between gap-3 border-t pt-3 text-xs">
                <span className="truncate">{c.salesperson?.name ?? t("unassigned")}</span>
                <span className="shrink-0">{formatRelativeTime(c.createdAt, locale)}</span>
              </div>
            </article>
          )}
        />
      )}
    </div>
  );
}

function CustomerName({ customer }: { customer: CustomerListItem }) {
  const initials = customer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const active = customer.bookings.active > 0;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          active ? "bg-gold text-brand-foreground shadow-sm" : "bg-muted text-foreground/70",
        )}
        aria-hidden
      >
        {initials || "?"}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium md:max-w-56" title={customer.name}>
          {customer.name}
        </p>
        <p className="text-muted-foreground font-mono text-xs">{customer.code}</p>
      </div>
    </div>
  );
}

function BookingsSummary({ customer, stacked = false }: { customer: CustomerListItem; stacked?: boolean }) {
  const t = useTranslations("customers");
  const locale = useAppLocale();
  const { total, active } = customer.bookings;
  if (total === 0) return <span className="text-muted-foreground text-xs">{t("noBookings")}</span>;
  return (
    <div className={cn("flex gap-1.5", stacked ? "flex-col items-end" : "flex-wrap items-center")}>
      {active > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300">
          <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
          {t("activeCount", { count: active })}
        </span>
      ) : null}
      <span className="text-muted-foreground text-xs whitespace-nowrap">
        {t("totalCount", { count: total, formatted: formatNumber(total, locale) })}
      </span>
    </div>
  );
}
