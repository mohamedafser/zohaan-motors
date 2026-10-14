import "server-only";

import { after } from "next/server";

import { deliverPendingPushes } from "@/lib/notifications/service";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const BOOKING_CREATED = "booking_created";
export const BOOKING_CANCELLED = "booking_cancelled";
export const BOOKING_SOLD = "booking_sold";

export type BookingEvent = "created" | "cancelled" | "sold";

const TYPES: Record<BookingEvent, string> = {
  created: BOOKING_CREATED,
  cancelled: BOOKING_CANCELLED,
  sold: BOOKING_SOLD,
};

type Joined<T> = T | T[] | null;
const one = <T>(value: Joined<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

/**
 * Tells every active Super Admin and the booking's sales executive (except whoever acted)
 * that a booking was created, cancelled or sold, in-app and by push. Runs after the
 * response so the booking isn't held up.
 */
export function alertBookingEvent(kind: BookingEvent, bookingId: string, actorId: string) {
  after(async () => {
    try {
      await createBookingAlert(kind, bookingId, actorId);
      await deliverPendingPushes();
    } catch (error) {
      console.error("[bookings] booking alert failed", error);
    }
  });
}

async function createBookingAlert(kind: BookingEvent, bookingId: string, actorId: string) {
  const admin = createServiceRoleClient();
  const [{ data: adminIds }, { data: bookingRow }, { data: actorRow }] = await Promise.all([
    admin.rpc("active_super_admin_ids" as never),
    admin
      .from("reservations")
      .select(
        "reservation_number, salesperson_id, selling_price, amount, currency, units, cancel_reason, vehicle_id, vehicles(stock_number, year, make, model, quantity), customers(display_name)",
      )
      .eq("id", bookingId)
      .maybeSingle(),
    admin.from("profiles").select("display_name").eq("id", actorId).maybeSingle(),
  ]);

  const booking = bookingRow as unknown as {
    reservation_number: string;
    salesperson_id: string | null;
    selling_price: number | string | null;
    amount: number | string;
    currency: string;
    units: number | null;
    cancel_reason: string | null;
    vehicle_id: string;
    vehicles: Joined<{
      stock_number: string | null;
      year: number | null;
      make: string | null;
      model: string | null;
      quantity: number | null;
    }>;
    customers: Joined<{ display_name: string }>;
  } | null;
  if (!booking) return;

  const recipients = [
    ...new Set([
      ...((adminIds ?? []) as unknown as string[]),
      ...(booking.salesperson_id ? [booking.salesperson_id] : []),
    ]),
  ].filter((id) => id !== actorId);
  if (recipients.length === 0) return;

  const vehicle = one(booking.vehicles);
  const { data: salesRow } = booking.salesperson_id
    ? await admin
        .from("profiles")
        .select("display_name")
        .eq("id", booking.salesperson_id)
        .maybeSingle()
    : { data: null };
  const actorName = (actorRow as { display_name: string } | null)?.display_name ?? null;
  const vehicleTitle =
    [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || null;
  const label = vehicleTitle || vehicle?.stock_number || "vehicle";
  const number = booking.reservation_number;
  const by = actorName ? ` by ${actorName}` : "";
  const customer = one(booking.customers)?.display_name ?? null;
  const forCustomer = customer ? ` for ${customer}` : "";

  const title =
    kind === "created" ? "New booking" : kind === "sold" ? "Car sold" : "Booking cancelled";
  const message =
    kind === "created"
      ? `Booking ${number} for ${label} was created${by}${forCustomer}.`
      : kind === "sold"
        ? `${label} (${number}) was sold${by}${forCustomer}.`
        : `Booking ${number} for ${label} was cancelled${by}.${booking.cancel_reason ? ` Reason: ${booking.cancel_reason}` : ""}`;

  const { error } = await admin.from("notifications").insert(
    recipients.map((userId) => ({
      user_id: userId,
      type: TYPES[kind],
      title,
      message,
      entity_type: "reservation",
      entity_id: bookingId,
      data: {
        bookingNumber: number,
        vehicleId: booking.vehicle_id,
        vehicleTitle,
        stockNumber: vehicle?.stock_number ?? null,
        customerName: customer,
        salespersonName: (salesRow as { display_name: string } | null)?.display_name ?? null,
        actorName,
        units: booking.units ?? vehicle?.quantity ?? 1,
        sellingPrice: booking.selling_price == null ? null : Number(booking.selling_price),
        deposit: Number(booking.amount),
        currency: booking.currency,
        reason: booking.cancel_reason,
      },
    })),
  );
  if (error) console.error("[bookings] could not save booking alert", error.message);
}
