import "server-only";

import { appConfig } from "@/config/app";
import { listBookings, type BookingListItem } from "@/lib/bookings/service";
import { canViewAllBookings } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import type { UserContext } from "@/types/auth";

export type MonthPoint = { month: string; revenue: number; units: number };
export type AgeBand = { key: "fresh" | "mid" | "aging" | "old"; units: number };
export type AttentionItem = {
  number: string;
  vehicle: string;
  customer: string;
  salesperson: string | null;
  kind: "deposit_due" | "balance_overdue" | "balance_due_soon";
  at: string;
  amount: number | null;
  currency: string;
};
export type Leader = { id: string; name: string; units: number; revenue: number; active: number };

export type DashboardData = {
  /** True when the numbers cover only the signed-in user's own bookings. */
  ownOnly: boolean;
  currency: string;
  stock: {
    inTransit: number;
    readyForSale: number;
    booked: number;
    /** Asking price × units for unsold stock (in transit + ready + booked). */
    askingValue: number;
    age: AgeBand[];
  };
  month: {
    soldUnits: number;
    revenue: number;
    /** Same figures for the previous month, for the change badge. */
    previousRevenue: number;
    previousUnits: number;
  };
  bookings: {
    active: number;
    activeValue: number;
    /** Still to collect on active and sold bookings. */
    toCollect: number;
    awaitingDeposit: number;
    balanceOverdue: number;
  };
  /** Last 90 days of bookings by outcome. */
  outcomes: { sold: number; active: number; cancelled: number };
  salesByMonth: MonthPoint[];
  attention: AttentionItem[];
  recent: BookingListItem[];
  /** Sales executives this month; only for people who see every booking. */
  leaders: Leader[] | null;
};

const monthKey = new Intl.DateTimeFormat("en-CA", { timeZone: appConfig.timezone, year: "numeric", month: "2-digit" });
/** "2026-10" in the dealership's time zone. */
const keyOf = (date: Date | string) => monthKey.format(typeof date === "string" ? new Date(date) : date).slice(0, 7);

function lastMonths(count: number) {
  const now = new Date();
  const [year, month] = keyOf(now).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const outstandingOf = (b: BookingListItem) =>
  b.totalPrice == null ? 0 : Math.max(0, b.totalPrice - b.deposit - (b.balanceReceived ?? 0));

const DAY = 86_400_000;

export async function getDashboard(context: UserContext): Promise<DashboardData> {
  const supabase = await createClient();
  const [bookingsResult, stockResult] = await Promise.all([
    listBookings(context),
    supabase
      .from("vehicles")
      .select("status, quantity, current_selling_price, purchase_date, created_at")
      .in("status", ["acquired", "ready_for_sale", "reserved"])
      .is("deleted_at", null),
  ]);
  const bookings = bookingsResult.data ?? [];
  type StockRow = {
    status: string;
    quantity: number | null;
    current_selling_price: number | string | null;
    purchase_date: string | null;
    created_at: string;
  };
  const stockRows = (stockResult.data ?? []) as StockRow[];

  // ---- Stock ---------------------------------------------------------------
  const now = Date.now();
  const stock = { inTransit: 0, readyForSale: 0, booked: 0, askingValue: 0 };
  const age: Record<AgeBand["key"], number> = { fresh: 0, mid: 0, aging: 0, old: 0 };
  for (const row of stockRows) {
    const units = row.quantity ?? 1;
    if (row.status === "acquired") stock.inTransit += units;
    if (row.status === "ready_for_sale") stock.readyForSale += units;
    if (row.status === "reserved") stock.booked += units;
    if (row.current_selling_price != null) stock.askingValue += Number(row.current_selling_price) * units;
    const days = (now - new Date(row.purchase_date ?? row.created_at).getTime()) / DAY;
    age[days <= 30 ? "fresh" : days <= 60 ? "mid" : days <= 90 ? "aging" : "old"] += units;
  }

  // ---- Sales by month (by the date the booking was marked sold) -------------
  const months = lastMonths(6);
  const byMonth = new Map(months.map((m) => [m, { month: m, revenue: 0, units: 0 }]));
  const sold = bookings.filter((b) => b.status === "converted" && b.soldAt);
  for (const b of sold) {
    const point = byMonth.get(keyOf(b.soldAt!));
    if (!point) continue;
    point.revenue += b.totalPrice ?? 0;
    point.units += b.units;
  }
  const salesByMonth = [...byMonth.values()];
  const thisMonth = salesByMonth.at(-1)!;
  const lastMonth = salesByMonth.at(-2)!;

  // ---- Bookings ------------------------------------------------------------
  const active = bookings.filter((b) => b.status === "active");
  const since90 = now - 90 * DAY;
  const recentWindow = bookings.filter((b) => new Date(b.reservedAt).getTime() >= since90);

  const attention: AttentionItem[] = [];
  for (const b of bookings) {
    const base = {
      number: b.number,
      vehicle: b.vehicle?.title ?? "—",
      customer: b.customer?.name ?? "—",
      salesperson: b.salesperson?.name ?? null,
      currency: b.currency,
    };
    if (b.depositDueAt) {
      attention.push({ ...base, kind: "deposit_due", at: b.depositDueAt, amount: null });
    } else if (b.balanceOverdue && b.balanceDueAt) {
      attention.push({ ...base, kind: "balance_overdue", at: b.balanceDueAt, amount: outstandingOf(b) });
    } else if (b.balanceDueAt && new Date(b.balanceDueAt).getTime() - now < 2 * DAY) {
      attention.push({ ...base, kind: "balance_due_soon", at: b.balanceDueAt, amount: outstandingOf(b) });
    }
  }
  // Overdue first, then whatever is due soonest.
  const rank = { balance_overdue: 0, deposit_due: 1, balance_due_soon: 2 } as const;
  attention.sort((a, b) => rank[a.kind] - rank[b.kind] || a.at.localeCompare(b.at));

  // ---- Sales executives (this month) ---------------------------------------
  let leaders: Leader[] | null = null;
  if (canViewAllBookings(context.roles)) {
    const board = new Map<string, Leader>();
    const row = (b: BookingListItem) => {
      const id = b.salesperson?.id ?? "none";
      if (!board.has(id)) board.set(id, { id, name: b.salesperson?.name ?? "—", units: 0, revenue: 0, active: 0 });
      return board.get(id)!;
    };
    for (const b of sold) {
      if (keyOf(b.soldAt!) !== thisMonth.month) continue;
      const leader = row(b);
      leader.units += b.units;
      leader.revenue += b.totalPrice ?? 0;
    }
    for (const b of active) row(b).active += 1;
    leaders = [...board.values()]
      .filter((l) => l.id !== "none")
      .sort((a, b) => b.revenue - a.revenue || b.active - a.active)
      .slice(0, 6);
  }

  return {
    ownOnly: !canViewAllBookings(context.roles),
    currency: bookings[0]?.currency ?? appConfig.currency,
    stock: {
      ...stock,
      age: (["fresh", "mid", "aging", "old"] as const).map((key) => ({ key, units: age[key] })),
    },
    month: {
      soldUnits: thisMonth.units,
      revenue: thisMonth.revenue,
      previousRevenue: lastMonth.revenue,
      previousUnits: lastMonth.units,
    },
    bookings: {
      active: active.length,
      activeValue: active.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0),
      toCollect: bookings
        .filter((b) => b.status === "active" || b.status === "converted")
        .reduce((sum, b) => sum + outstandingOf(b), 0),
      awaitingDeposit: active.filter((b) => b.depositDueAt).length,
      balanceOverdue: bookings.filter((b) => b.balanceOverdue).length,
    },
    outcomes: {
      sold: recentWindow.filter((b) => b.status === "converted").length,
      active: recentWindow.filter((b) => b.status === "active").length,
      cancelled: recentWindow.filter((b) => b.status === "cancelled" || b.status === "expired").length,
    },
    salesByMonth,
    attention: attention.slice(0, 6),
    recent: bookings.slice(0, 5),
    leaders,
  };
}
