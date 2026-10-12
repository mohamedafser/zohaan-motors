import { hasPermission } from "@/lib/permissions";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CreateBookingValues } from "@/lib/validation/booking";
import type { UserContext } from "@/types/auth";

export type BookingStatus = "active" | "expired" | "cancelled" | "converted";

export type BookingListItem = {
  id: string;
  number: string;
  status: BookingStatus;
  deposit: number;
  currency: string;
  reservedAt: string;
  expiresAt: string;
  notes: string | null;
  vehicle: { id: string; stockNumber: string | null; title: string; status: string } | null;
  customer: { id: string; name: string; phone: string } | null;
  salesperson: { id: string; name: string } | null;
};

export type BookableVehicle = { id: string; stockNumber: string | null; title: string; branchId: string };
export type PersonOption = { id: string; name: string };
export type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  /** The sales executive this customer belongs to (from their first booking). */
  salesperson: PersonOption | null;
};

export type BookingError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};
type Result<T> = { data: T; error: null } | { data: null; error: BookingError };

const fail = (code: string, message: string, fieldErrors?: Record<string, string>) => ({
  data: null,
  error: { code, message, fieldErrors },
});

function vehicleTitle(v: { year: number | null; make: string | null; model: string | null }) {
  return [v.year, v.make, v.model].filter(Boolean).join(" ");
}

type Joined<T> = T | T[] | null;
const one = <T,>(value: Joined<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

// A customer's sales executive is the salesperson on their first booking.
// Read with the service role so every salesperson sees the same owner.
async function customerOwners(customerIds?: string[]): Promise<Map<string, string>> {
  const admin = createServiceRoleClient();
  let query = admin
    .from("reservations")
    .select("customer_id, salesperson_id, reserved_at")
    .not("salesperson_id", "is", null)
    .order("reserved_at", { ascending: true });
  if (customerIds) query = query.in("customer_id", customerIds);
  const { data } = await query;
  const owners = new Map<string, string>();
  for (const row of (data ?? []) as unknown as { customer_id: string; salesperson_id: string }[]) {
    if (!owners.has(row.customer_id)) owners.set(row.customer_id, row.salesperson_id);
  }
  return owners;
}

async function profileNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const admin = createServiceRoleClient();
  const { data } = await admin.from("profiles").select("id, display_name").in("id", ids);
  return new Map(((data ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]));
}

async function listSalesExecutives(): Promise<PersonOption[]> {
  const admin = createServiceRoleClient();
  const { data: role } = await admin.from("roles").select("id").eq("key", "sales_executive").maybeSingle();
  if (!role) return [];
  const { data: links } = await admin.from("user_roles").select("user_id").eq("role_id", (role as { id: string }).id);
  const ids = ((links ?? []) as { user_id: string }[]).map((l) => l.user_id);
  if (ids.length === 0) return [];
  const { data } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", ids)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("display_name");
  return ((data ?? []) as { id: string; display_name: string }[]).map((p) => ({ id: p.id, name: p.display_name }));
}

const isSalesExecutive = (context: UserContext) => context.roles.includes("sales_executive");

export async function listBookings(): Promise<Result<BookingListItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, reservation_number, status, amount, currency, reserved_at, expires_at, notes, salesperson_id, vehicles(id, stock_number, year, make, model, status), customers(id, display_name, phone)",
    )
    .order("reserved_at", { ascending: false })
    .limit(500);
  if (error) return fail(error.code ?? "db_error", error.message);

  type Row = {
    id: string;
    reservation_number: string;
    status: BookingStatus;
    amount: number;
    currency: string;
    reserved_at: string;
    expires_at: string;
    notes: string | null;
    salesperson_id: string | null;
    vehicles: Joined<{ id: string; stock_number: string | null; year: number | null; make: string | null; model: string | null; status: string }>;
    customers: Joined<{ id: string; display_name: string; phone: string }>;
  };

  const rows = (data ?? []) as unknown as Row[];
  const names = await profileNames([...new Set(rows.map((r) => r.salesperson_id).filter((id): id is string => !!id))]);
  const now = Date.now();
  return {
    data: rows.map((row) => {
      const vehicle = one(row.vehicles);
      const customer = one(row.customers);
      // Active bookings past their expiry date are shown as expired.
      const status =
        row.status === "active" && new Date(row.expires_at).getTime() < now ? "expired" : row.status;
      return {
        id: row.id,
        number: row.reservation_number,
        status,
        deposit: Number(row.amount),
        currency: row.currency,
        reservedAt: row.reserved_at,
        expiresAt: row.expires_at,
        notes: row.notes,
        vehicle: vehicle
          ? { id: vehicle.id, stockNumber: vehicle.stock_number, title: vehicleTitle(vehicle), status: vehicle.status }
          : null,
        customer: customer ? { id: customer.id, name: customer.display_name, phone: customer.phone } : null,
        salesperson: row.salesperson_id
          ? { id: row.salesperson_id, name: names.get(row.salesperson_id) ?? "—" }
          : null,
      };
    }),
    error: null,
  };
}

export async function listBookingOptions(context: UserContext): Promise<
  Result<{
    vehicles: BookableVehicle[];
    customers: CustomerOption[];
    salesExecutives: PersonOption[];
    /** Set when the caller is a sales executive: new customers are always theirs. */
    selfSalespersonId: string | null;
  }>
> {
  const supabase = await createClient();
  const [vehicles, customers] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, stock_number, year, make, model, branch_id")
      .eq("status", "ready_for_sale")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, display_name, phone")
      .is("deleted_at", null)
      .order("display_name")
      .limit(1000),
  ]);
  if (vehicles.error) return fail(vehicles.error.code ?? "db_error", vehicles.error.message);

  type V = { id: string; stock_number: string | null; year: number | null; make: string | null; model: string | null; branch_id: string };
  type C = { id: string; display_name: string; phone: string };
  const customerRows = (customers.data ?? []) as C[];
  const [owners, salesExecutives] = await Promise.all([
    customerOwners(customerRows.map((c) => c.id)),
    listSalesExecutives(),
  ]);
  const ownerNames = await profileNames([...new Set(owners.values())]);
  return {
    data: {
      vehicles: ((vehicles.data ?? []) as V[]).map((v) => ({
        id: v.id,
        stockNumber: v.stock_number,
        title: vehicleTitle(v),
        branchId: v.branch_id,
      })),
      customers: customerRows.map((c) => {
        const ownerId = owners.get(c.id);
        return {
          id: c.id,
          name: c.display_name,
          phone: c.phone,
          salesperson: ownerId ? { id: ownerId, name: ownerNames.get(ownerId) ?? "—" } : null,
        };
      }),
      salesExecutives,
      selfSalespersonId: isSalesExecutive(context) ? context.userId : null,
    },
    error: null,
  };
}

function code(prefix: string) {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${prefix}-${ymd}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

// Vehicle status is changed with the service role: booking staff may hold
// reservation permissions without vehicle.status.change. Callers check permissions first.
async function setVehicleStatus(vehicleId: string, from: string, to: string, userId: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("vehicles")
    .update({ status: to, updated_by: userId })
    .eq("id", vehicleId)
    .eq("status", from)
    .select("id");
  return !error && (data?.length ?? 0) === 1;
}

export async function createBooking(
  values: CreateBookingValues,
  context: UserContext,
): Promise<Result<{ id: string }>> {
  if (!hasPermission(context.permissions, "reservation.create", context.roles)) {
    return fail("forbidden", "You do not have permission to create bookings.");
  }

  // End of the chosen day in UAE time (UTC+4).
  const expiresAt = new Date(`${values.expiresOn}T23:59:59+04:00`);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return fail("validation", "Expiry must be in the future.", { expiresOn: "bookings.errors.expiryPast" });
  }

  const supabase = await createClient();
  const { data: vehicleRow } = await supabase
    .from("vehicles")
    .select("id, status, branch_id")
    .eq("id", values.vehicleId)
    .is("deleted_at", null)
    .maybeSingle();
  const vehicle = vehicleRow as { id: string; status: string; branch_id: string } | null;
  if (!vehicle) return fail("not_found", "Vehicle not found.", { vehicleId: "bookings.errors.vehicleNotFound" });
  if (vehicle.status !== "ready_for_sale") {
    return fail("not_available", "Vehicle is not ready for sale.", { vehicleId: "bookings.errors.notAvailable" });
  }

  let customerId = values.customerId ?? null;
  let createdCustomerId: string | null = null;
  let salespersonId: string | null = null;
  const salesExecutives = await listSalesExecutives();
  const isValidSalesExecutive = (id: string | null | undefined) =>
    !!id && salesExecutives.some((p) => p.id === id);

  if (values.customerMode === "existing") {
    // Existing customers always stay with the sales executive from their first booking.
    salespersonId = (await customerOwners([customerId!])).get(customerId!) ?? null;
  } else {
    if (!hasPermission(context.permissions, "customer.create", context.roles)) {
      return fail("forbidden", "You do not have permission to add customers.");
    }
    const { data: existing } = await createServiceRoleClient()
      .from("customers")
      .select("id, display_name")
      .eq("phone", values.phone!)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) {
      return fail("customer_exists", "A customer with this phone number already exists.", {
        phone: "bookings.errors.customerExists",
      });
    }
  }

  if (!salespersonId) {
    salespersonId = isSalesExecutive(context) ? context.userId : (values.salespersonId ?? null);
    if (!isValidSalesExecutive(salespersonId)) {
      return fail("validation", "Choose the sales executive for this customer.", {
        salespersonId: "bookings.errors.salespersonRequired",
      });
    }
  }

  if (values.customerMode === "new") {
    const firstName = values.firstName!.trim();
    const lastName = values.lastName!.trim();
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        customer_code: code("CUS"),
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        phone: values.phone!,
        branch_id: vehicle.branch_id,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      return fail("customer_exists", "A customer with this phone number already exists.", {
        phone: "bookings.errors.customerExists",
      });
    }
    if (error || !customer) return fail("customer_failed", error?.message ?? "Could not add the customer.");
    customerId = (customer as { id: string }).id;
    createdCustomerId = customerId;
  }

  const admin = createServiceRoleClient();
  const undoCustomer = async () => {
    if (createdCustomerId) await admin.from("customers").delete().eq("id", createdCustomerId);
  };

  const { data: bookingRow, error: bookingError } = await supabase
    .from("reservations")
    .insert({
      reservation_number: code("BK"),
      vehicle_id: vehicle.id,
      customer_id: customerId,
      salesperson_id: salespersonId,
      branch_id: vehicle.branch_id,
      amount: values.deposit,
      expires_at: expiresAt.toISOString(),
      notes: values.notes || null,
      created_by: context.userId,
    })
    .select("id")
    .single();
  const booking = bookingRow as { id: string } | null;

  if (bookingError || !booking) {
    await undoCustomer();
    if (bookingError?.code === "23505") {
      return fail("already_booked", "This vehicle already has an active booking.", {
        vehicleId: "bookings.errors.alreadyBooked",
      });
    }
    return fail("booking_failed", bookingError?.message ?? "Could not create the booking.");
  }

  if (!(await setVehicleStatus(vehicle.id, "ready_for_sale", "reserved", context.userId))) {
    await admin.from("reservations").delete().eq("id", booking.id);
    await undoCustomer();
    return fail("not_available", "Vehicle status changed. Try again.", { vehicleId: "bookings.errors.notAvailable" });
  }

  return { data: { id: booking.id }, error: null };
}

export async function updateBooking(
  id: string,
  action: { action: "cancel"; reason?: string } | { action: "sold" },
  context: UserContext,
): Promise<Result<true>> {
  const allowed =
    action.action === "cancel"
      ? hasPermission(context.permissions, "reservation.cancel", context.roles)
      : hasPermission(context.permissions, "sale.create", context.roles) ||
        hasPermission(context.permissions, "vehicle.status.change", context.roles);
  if (!allowed) return fail("forbidden", "You do not have permission for this action.");

  const supabase = await createClient();
  const { data: bookingRow } = await supabase
    .from("reservations")
    .select("id, status, vehicle_id")
    .eq("id", id)
    .maybeSingle();
  const booking = bookingRow as { id: string; status: string; vehicle_id: string } | null;
  if (!booking) return fail("not_found", "Booking not found.");
  if (booking.status !== "active") return fail("not_active", "This booking is no longer active.");

  const patch =
    action.action === "cancel"
      ? {
          status: "cancelled" as const,
          cancelled_at: new Date().toISOString(),
          cancel_reason: action.reason || null,
        }
      : { status: "converted" as const };

  // Booking first: a sold vehicle can't move back to booked, but a booking can be re-activated.
  const { error } = await supabase.from("reservations").update(patch).eq("id", id);
  if (error) return fail(error.code ?? "db_error", error.message);

  const nextVehicleStatus = action.action === "cancel" ? "ready_for_sale" : "sold";
  if (!(await setVehicleStatus(booking.vehicle_id, "reserved", nextVehicleStatus, context.userId))) {
    await createServiceRoleClient()
      .from("reservations")
      .update({ status: "active", cancelled_at: null, cancel_reason: null })
      .eq("id", id);
    return fail("vehicle_state", "The vehicle is no longer booked.");
  }
  return { data: true, error: null };
}
