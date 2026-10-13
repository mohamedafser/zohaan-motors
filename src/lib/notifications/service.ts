import "server-only";

import { bookingHref } from "@/lib/bookings/routes";
import { isPushConfigured, sendPushToUsers } from "@/lib/notifications/push";
import { getPaymentTerms } from "@/lib/settings/payment-terms";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/types/notification";

type Row = {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

/** Where a notification leads when opened. */
export function notificationHref(type: string, data: Record<string, unknown> | null): string {
  const number = typeof data?.bookingNumber === "string" ? data.bookingNumber : "";
  if (type === "booking_auto_cancelled" || type === "booking_balance_overdue") {
    return number ? bookingHref(number) : "/bookings";
  }
  return "/notifications";
}

const toNotification = (row: Row): AppNotification => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  entityId: row.entity_id,
  data: row.data ?? {},
  href: notificationHref(row.type, row.data),
  createdAt: row.created_at,
  read: row.is_read,
});

/** The signed-in user's latest notifications (RLS limits rows to their own). */
export async function listNotifications(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, entity_type, entity_id, data, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: null, error: error.message };
  return { data: ((data ?? []) as unknown as Row[]).map(toNotification), error: null };
}

export async function markNotificationsRead(userId: string, ids: string[] | "all") {
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (ids !== "all") query = query.in("id", ids);
  const { error } = await query;
  return error ? error.message : null;
}

// ---------------------------------------------------------------------------
// Booking payment deadlines
// ---------------------------------------------------------------------------

/**
 * Applies the payment terms from Settings: cancels bookings whose deposit didn't
 * arrive in time (freeing the cars, alerting Super Admins) and alerts the sales
 * executive and Super Admins when the full amount is overdue. Then pushes every
 * notification not delivered yet, including ones created by the pg_cron jobs.
 */
export async function runBookingDeadlineSweep() {
  const admin = createServiceRoleClient();
  const deposit = await admin.rpc("cancel_unpaid_bookings");
  if (deposit.error) console.error("[bookings] deposit sweep failed", deposit.error.message);
  const balance = await admin.rpc("notify_overdue_balances");
  if (balance.error) console.error("[bookings] balance sweep failed", balance.error.message);
  const pushed = await deliverPendingPushes();
  return { cancelled: deposit.data ?? 0, balanceOverdue: balance.data ?? 0, pushed };
}

async function deliverPendingPushes() {
  // Without VAPID keys, leave notifications unclaimed so they push once keys are added.
  if (!isPushConfigured()) return 0;
  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Claiming with pushed_at makes sure concurrent sweeps never push the same row twice.
  const { data } = await admin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .is("pushed_at", null)
    .gte("created_at", since)
    .select("id, user_id, type, title, message, data");
  const rows = (data ?? []) as {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
  }[];
  await Promise.all(
    rows.map((row) =>
      sendPushToUsers([row.user_id], {
        title: row.title,
        body: row.message,
        url: notificationHref(row.type, row.data),
        tag: row.id,
      }),
    ),
  );
  return rows.length;
}

const SWEEP_INTERVAL_MS = 30 * 1000;
let lastSweepAt = 0;
/** Earliest upcoming deadline seen at the last sweep; reaching it forces a new sweep. */
let nextDeadlineAt: number | null = null;

/**
 * The earliest deposit or full-payment deadline still ahead, so clients can check
 * again right when it passes instead of waiting for the next poll.
 */
export async function findNextBookingDeadline(): Promise<number | null> {
  const terms = await getPaymentTerms();
  const { data } = await createServiceRoleClient()
    .from("reservations")
    .select("status, reserved_at, amount, selling_price, balance_received, balance_overdue_notified_at, vehicles(quantity)")
    .in("status", ["active", "converted"])
    .limit(1000);
  type Row = {
    status: string;
    reserved_at: string;
    amount: number | string;
    selling_price: number | string | null;
    balance_received: number | string | null;
    balance_overdue_notified_at: string | null;
    vehicles: { quantity: number | null } | { quantity: number | null }[] | null;
  };
  const now = Date.now();
  let next: number | null = null;
  const consider = (at: number) => {
    if (at > now && (next === null || at < next)) next = at;
  };
  for (const row of (data ?? []) as unknown as Row[]) {
    const bookedAt = new Date(row.reserved_at).getTime();
    const deposit = Number(row.amount);
    if (row.status === "active" && deposit <= 0) consider(bookedAt + terms.depositMinutes * 60_000);
    if (row.balance_overdue_notified_at || row.selling_price == null) continue;
    const vehicle = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
    const total = Number(row.selling_price) * (vehicle?.quantity ?? 1);
    if (deposit + Number(row.balance_received ?? 0) < total - 0.005) {
      consider(bookedAt + terms.balanceMinutes * 60_000);
    }
  }
  return next;
}

/**
 * Runs the sweep at most every 30 seconds per server instance, or right away once a
 * known deadline has passed. Called (and awaited) from routes every signed-in client
 * polls, so a missed deadline shows up in the same response.
 * Returns the next upcoming deadline (epoch ms) for the client to schedule a re-check.
 */
export async function maybeRunBookingDeadlineSweep(): Promise<number | null> {
  const now = Date.now();
  const deadlineDue = nextDeadlineAt !== null && now >= nextDeadlineAt;
  if (now - lastSweepAt < SWEEP_INTERVAL_MS && !deadlineDue) return nextDeadlineAt;
  lastSweepAt = now;
  try {
    await runBookingDeadlineSweep();
    nextDeadlineAt = await findNextBookingDeadline();
  } catch (error) {
    console.error("[bookings] deadline sweep failed", error);
  }
  return nextDeadlineAt;
}

/** Forget the cached deadline (e.g. a booking was created or edited). */
export function invalidateBookingDeadlines() {
  nextDeadlineAt = null;
  lastSweepAt = 0;
}
