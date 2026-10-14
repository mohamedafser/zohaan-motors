import { alertBookingEvent } from "@/lib/bookings/alerts";
import { hasPermission, type Permission } from "@/lib/permissions";
import {
  canViewAllBookings,
  isSalesExecutive as isSalesExecutiveRole,
} from "@/lib/permissions/roles";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getPaymentTerms } from "@/lib/settings/payment-terms";
import { createClient } from "@/lib/supabase/server";
import { quantityTotal } from "@/lib/vehicles/quantity";
import { getPrimaryPhotoUrls } from "@/lib/vehicles/photos";
import { mergeReadySplitUnits, recordForUnits, undoVehicleSplit } from "@/lib/vehicles/units";
import type { BookingActionValues, CreateBookingValues } from "@/lib/validation/booking";
import { deadlineFrom, type PaymentTerms } from "@/lib/validation/payment-terms";
import type { UserContext } from "@/types/auth";
import type { VehicleBookingInfo } from "@/types/vehicle";

export type BookingStatus = "active" | "expired" | "cancelled" | "converted";

export type BookingListItem = {
  id: string;
  number: string;
  status: BookingStatus;
  deposit: number;
  /** Agreed price per unit. */
  sellingPrice: number | null;
  /** Units held by this booking (multi-unit records book several at once). */
  units: number;
  /** Selling price × units. */
  totalPrice: number | null;
  /** What the customer still owes on top of the deposit: total − deposit. */
  balanceDue: number | null;
  /** Balance paid when the booking was marked sold. */
  balanceReceived: number | null;
  soldAt: string | null;
  currency: string;
  reservedAt: string;
  /** Older bookings had a hold-until date; new ones don't expire. */
  expiresAt: string | null;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  /** When the sales executive and Super Admins were alerted about the full payment. */
  balanceAlertedAt: string | null;
  createdBy: string | null;
  /** Cancelled by the system because no deposit arrived in time. */
  autoCancelled: boolean;
  /** Active bookings without a deposit are cancelled automatically at this time. */
  depositDueAt: string | null;
  /** When the full amount is due, while some of it is still outstanding. */
  balanceDueAt: string | null;
  /** The full-payment deadline has passed with money still outstanding. */
  balanceOverdue: boolean;
  /** What the signed-in user may do with this booking (permissions + ownership). */
  can: { edit: boolean; sell: boolean; cancel: boolean };
  vehicle: { id: string; stockNumber: string | null; title: string; status: string } | null;
  customer: { id: string; name: string; phone: string } | null;
  salesperson: { id: string; name: string } | null;
  branchId: string;
};

export type BookableVehicle = {
  id: string;
  stockNumber: string | null;
  title: string;
  branchId: string;
  /** Current selling price, used to prefill the booking's selling price. */
  sellingPrice: number | null;
  /** Units on the record; the booking can take some or all of them. */
  quantity: number;
};
export type PersonOption = {
  id: string;
  name: string;
  /** Super Admins can be a booking's sales person too; the form tags them. */
  isSuperAdmin?: boolean;
};
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
const one = <T>(value: Joined<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

// A customer's sales executive is the salesperson on their first booking.
// Read with the service role so every salesperson sees the same owner.
export async function customerOwners(customerIds?: string[]): Promise<Map<string, string>> {
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

export async function profileNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const admin = createServiceRoleClient();
  const { data } = await admin.from("profiles").select("id, display_name").in("id", ids);
  return new Map(
    ((data ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
  );
}

/** Roles a booking's sales person can have: Super Admins sell too. */
export const SALESPERSON_ROLES = ["sales_executive", "super_admin"];

/** Active users with any of the roles (by default, sales executives). */
export async function listSalesExecutives(
  roleKeys: string[] = ["sales_executive"],
): Promise<PersonOption[]> {
  const admin = createServiceRoleClient();
  const { data: roles } = await admin.from("roles").select("id, key").in("key", roleKeys);
  const roleRows = (roles ?? []) as { id: string; key: string }[];
  if (roleRows.length === 0) return [];
  const { data: links } = await admin
    .from("user_roles")
    .select("user_id, role_id")
    .in(
      "role_id",
      roleRows.map((r) => r.id),
    );
  const linkRows = (links ?? []) as { user_id: string; role_id: string }[];
  const superAdminRoleId = roleRows.find((r) => r.key === "super_admin")?.id;
  const superAdmins = new Set(
    linkRows.filter((l) => l.role_id === superAdminRoleId).map((l) => l.user_id),
  );
  const ids = [...new Set(linkRows.map((l) => l.user_id))];
  if (ids.length === 0) return [];
  const { data } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", ids)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("display_name");
  return ((data ?? []) as { id: string; display_name: string }[]).map((p) => ({
    id: p.id,
    name: p.display_name,
    ...(superAdmins.has(p.id) ? { isSuperAdmin: true } : {}),
  }));
}

const isSalesExecutive = (context: UserContext) => isSalesExecutiveRole(context.roles);

/** Everyone except Super Admins and Accountants works only with their own bookings. */
const ownBookingsOnly = (context: UserContext) => !canViewAllBookings(context.roles);

function ownBookingFilter(context: UserContext) {
  return `created_by.eq.${context.userId},salesperson_id.eq.${context.userId}`;
}

const isOwnBooking = (
  booking: { created_by: string | null; salesperson_id: string | null },
  context: UserContext,
) => booking.created_by === context.userId || booking.salesperson_id === context.userId;

type Ownership = { created_by: string | null; salesperson_id: string | null };

// Sales executives may edit, sell and cancel their own bookings even without the
// broader sale/status permissions. Other roles go by permission, and only Super Admins
// and Accountants may act on bookings that aren't theirs.
function canActOnBooking(booking: Ownership, context: UserContext, ...permissions: Permission[]) {
  const own = isOwnBooking(booking, context);
  if (isSalesExecutive(context)) return own;
  if (ownBookingsOnly(context) && !own) return false;
  return permissions.some((permission) =>
    hasPermission(context.permissions, permission, context.roles),
  );
}

const canEditBooking = (booking: Ownership, context: UserContext) =>
  canActOnBooking(booking, context, "reservation.create");

const canSellBooking = (booking: Ownership, context: UserContext) =>
  canActOnBooking(booking, context, "sale.create", "vehicle.status.change");

const canCancelBooking = (booking: Ownership, context: UserContext) =>
  canActOnBooking(booking, context, "reservation.cancel");

/** Selling a ready-for-sale car straight away (no booking first). */
export const canSellDirectly = (context: UserContext) =>
  hasPermission(context.permissions, "sale.create", context.roles) ||
  hasPermission(context.permissions, "vehicle.status.change", context.roles);

export async function listBookings(
  context: UserContext,
  options: { number?: string } = {},
): Promise<Result<BookingListItem[]>> {
  const supabase = await createClient();
  let query = supabase
    .from("reservations")
    .select(
      "id, reservation_number, status, amount, selling_price, balance_received, sold_at, cancelled_at, currency, reserved_at, expires_at, notes, cancel_reason, auto_cancelled, balance_overdue_notified_at, created_by, salesperson_id, branch_id, units, vehicles(id, stock_number, year, make, model, status, quantity), customers(id, display_name, phone)",
    );
  if (options.number) query = query.eq("reservation_number", options.number);
  // RLS enforces the same rule; filtering here keeps it explicit in the app.
  if (ownBookingsOnly(context)) query = query.or(ownBookingFilter(context));
  const { data, error } = await query.order("reserved_at", { ascending: false }).limit(500);
  if (error) return fail(error.code ?? "db_error", error.message);

  type Row = {
    id: string;
    reservation_number: string;
    status: BookingStatus;
    amount: number;
    selling_price: number | string | null;
    balance_received: number | string | null;
    sold_at: string | null;
    cancelled_at: string | null;
    currency: string;
    reserved_at: string;
    expires_at: string | null;
    notes: string | null;
    cancel_reason: string | null;
    balance_overdue_notified_at: string | null;
    auto_cancelled: boolean | null;
    created_by: string | null;
    salesperson_id: string | null;
    branch_id: string;
    /** Set once the booking's split units were merged back into another record. */
    units: number | null;
    vehicles: Joined<{
      id: string;
      stock_number: string | null;
      year: number | null;
      make: string | null;
      model: string | null;
      status: string;
      quantity: number | null;
    }>;
    customers: Joined<{ id: string; display_name: string; phone: string }>;
  };

  const rows = (data ?? []) as unknown as Row[];
  const [names, terms] = await Promise.all([
    profileNames([
      ...new Set(rows.map((r) => r.salesperson_id).filter((id): id is string => !!id)),
    ]),
    getPaymentTerms(),
  ]);
  const now = Date.now();
  return {
    data: rows.map((row) => {
      const vehicle = one(row.vehicles);
      const customer = one(row.customers);
      // Active bookings past their expiry date are shown as expired.
      const status =
        row.status === "active" && row.expires_at && new Date(row.expires_at).getTime() < now
          ? "expired"
          : row.status;
      const deposit = Number(row.amount);
      const sellingPrice = row.selling_price == null ? null : Number(row.selling_price);
      const units = row.units ?? vehicle?.quantity ?? 1;
      const totalPrice = quantityTotal(sellingPrice, units);
      const balanceReceived = row.balance_received == null ? null : Number(row.balance_received);
      const outstanding = totalPrice == null ? 0 : totalPrice - deposit - (balanceReceived ?? 0);
      const balanceDueAt =
        (status === "active" || status === "converted") && outstanding > 0.005
          ? deadlineFrom(row.reserved_at, terms.balanceMinutes)
          : null;
      return {
        id: row.id,
        number: row.reservation_number,
        status,
        deposit,
        sellingPrice,
        units,
        totalPrice,
        balanceDue:
          totalPrice == null ? null : Math.max(0, Math.round((totalPrice - deposit) * 100) / 100),
        balanceReceived,
        soldAt: row.sold_at,
        currency: row.currency,
        reservedAt: row.reserved_at,
        expiresAt: row.expires_at,
        notes: row.notes,
        cancelReason: row.cancel_reason,
        cancelledAt: row.cancelled_at,
        balanceAlertedAt: row.balance_overdue_notified_at,
        createdBy: row.created_by,
        autoCancelled: row.auto_cancelled ?? false,
        depositDueAt:
          status === "active" && deposit <= 0
            ? deadlineFrom(row.reserved_at, terms.depositMinutes)
            : null,
        balanceDueAt,
        balanceOverdue: balanceDueAt != null && new Date(balanceDueAt).getTime() < now,
        can: {
          edit: status === "active" && canEditBooking(row, context),
          sell: status === "active" && canSellBooking(row, context),
          cancel: status === "active" && canCancelBooking(row, context),
        },
        vehicle: vehicle
          ? {
              id: vehicle.id,
              stockNumber: vehicle.stock_number,
              title: vehicleTitle(vehicle),
              status: vehicle.status,
            }
          : null,
        customer: customer
          ? { id: customer.id, name: customer.display_name, phone: customer.phone }
          : null,
        salesperson: row.salesperson_id
          ? { id: row.salesperson_id, name: names.get(row.salesperson_id) ?? "—" }
          : null,
        branchId: row.branch_id,
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
    paymentTerms: PaymentTerms;
  }>
> {
  const supabase = await createClient();
  const [vehicles, customers] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, stock_number, year, make, model, branch_id, current_selling_price, quantity")
      .eq("status", "ready_for_sale")
      .eq("has_minimum_price", true)
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

  type V = {
    id: string;
    stock_number: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    branch_id: string;
    current_selling_price: number | string | null;
    quantity: number | null;
  };
  type C = { id: string; display_name: string; phone: string };
  const customerRows = (customers.data ?? []) as C[];
  const [owners, salesExecutives] = await Promise.all([
    customerOwners(customerRows.map((c) => c.id)),
    listSalesExecutives(SALESPERSON_ROLES),
  ]);
  const ownerNames = await profileNames([...new Set(owners.values())]);
  return {
    data: {
      vehicles: ((vehicles.data ?? []) as V[]).map((v) => ({
        id: v.id,
        stockNumber: v.stock_number,
        title: vehicleTitle(v),
        branchId: v.branch_id,
        sellingPrice: v.current_selling_price == null ? null : Number(v.current_selling_price),
        quantity: v.quantity ?? 1,
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
      paymentTerms: await getPaymentTerms(),
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

// The minimum is hidden from sales roles, so it's read with the service role and
// only the pass/fail result is returned.
async function checkMinimumPrice(vehicleId: string, sellingPrice: number) {
  const { data } = await createServiceRoleClient()
    .from("vehicles")
    .select("minimum_selling_price")
    .eq("id", vehicleId)
    .maybeSingle();
  const minimum = Number(
    (data as { minimum_selling_price: number | string | null } | null)?.minimum_selling_price ?? 0,
  );
  if (sellingPrice >= minimum) return null;
  return fail("below_minimum", "The selling price is below the minimum allowed for this car.", {
    sellingPrice: "bookings.errors.belowMinimum",
  });
}

/**
 * Books a ready-for-sale car for a customer. With `sell`, the car is sold on the spot
 * instead: the booking is recorded as already sold with the full price received, and
 * the car moves straight to Sold.
 */
export async function createBooking(
  values: CreateBookingValues,
  context: UserContext,
): Promise<Result<{ id: string }>> {
  const sell = values.sell === true;
  if (
    sell
      ? !canSellDirectly(context)
      : !hasPermission(context.permissions, "reservation.create", context.roles)
  ) {
    return fail(
      "forbidden",
      sell
        ? "You do not have permission to sell cars."
        : "You do not have permission to create bookings.",
    );
  }

  const supabase = await createClient();
  const { data: vehicleRow } = await supabase
    .from("vehicles")
    .select("id, status, branch_id, has_minimum_price, quantity")
    .eq("id", values.vehicleId)
    .is("deleted_at", null)
    .maybeSingle();
  const vehicle = vehicleRow as {
    id: string;
    status: string;
    branch_id: string;
    has_minimum_price: boolean | null;
    quantity: number | null;
  } | null;
  if (!vehicle)
    return fail("not_found", "Vehicle not found.", {
      vehicleId: "bookings.errors.vehicleNotFound",
    });
  if (vehicle.status !== "ready_for_sale") {
    return fail("not_available", "Vehicle is not ready for sale.", {
      vehicleId: "bookings.errors.notAvailable",
    });
  }
  const units = vehicle.quantity ?? 1;
  if (values.quantity != null && values.quantity > units) {
    return fail("validation", `Only ${units} units are available.`, {
      quantity: "bookings.errors.tooManyUnits",
    });
  }
  if (!vehicle.has_minimum_price) {
    return fail("no_minimum_price", "Set a minimum selling price before booking this car.", {
      vehicleId: "bookings.errors.noMinimumPrice",
    });
  }

  const belowMinimum = await checkMinimumPrice(vehicle.id, values.sellingPrice);
  if (belowMinimum) return belowMinimum;

  let customerId = values.customerId ?? null;
  let createdCustomerId: string | null = null;
  let salespersonId: string | null = null;
  const salesExecutives = await listSalesExecutives(SALESPERSON_ROLES);
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
    if (error || !customer)
      return fail("customer_failed", error?.message ?? "Could not add the customer.");
    customerId = (customer as { id: string }).id;
    createdCustomerId = customerId;
  }

  const admin = createServiceRoleClient();
  // Booking some of a multi-unit record moves those units to their own record first.
  const target = await recordForUnits(
    { id: vehicle.id, quantity: units },
    values.quantity,
    context.userId,
  );
  if (target.error !== null) {
    if (createdCustomerId) await admin.from("customers").delete().eq("id", createdCustomerId);
    return fail("split_failed", target.error);
  }
  // Removes a customer created for this booking and puts split units back.
  const rollback = async () => {
    if (createdCustomerId) await admin.from("customers").delete().eq("id", createdCustomerId);
    if (target.split) await undoVehicleSplit(target.id);
  };

  // A direct sale is paid in full: no deposit, the whole price received on completion.
  // It's written with the service role since sellers may not hold reservation.create.
  const soldUnits = values.quantity ?? units;
  const sale = sell
    ? {
        amount: 0,
        status: "converted" as const,
        balance_received: quantityTotal(values.sellingPrice, soldUnits) ?? 0,
        sold_at: new Date().toISOString(),
        sold_by: context.userId,
      }
    : { amount: values.deposit };
  const { data: bookingRow, error: bookingError } = await (sell ? admin : supabase)
    .from("reservations")
    .insert({
      reservation_number: code("BK"),
      vehicle_id: target.id,
      customer_id: customerId,
      salesperson_id: salespersonId,
      branch_id: vehicle.branch_id,
      selling_price: values.sellingPrice,
      expires_at: null,
      notes: values.notes || null,
      created_by: context.userId,
      ...sale,
    })
    .select("id")
    .single();
  const booking = bookingRow as { id: string } | null;

  if (bookingError || !booking) {
    await rollback();
    // DB trigger backstop (e.g. minimum price removed after the check above).
    if (bookingError?.message?.includes("minimum selling price not set")) {
      return fail("no_minimum_price", "Set a minimum selling price before booking this car.", {
        vehicleId: "bookings.errors.noMinimumPrice",
      });
    }
    if (bookingError?.code === "23505") {
      return fail("already_booked", "This vehicle already has an active booking.", {
        vehicleId: "bookings.errors.alreadyBooked",
      });
    }
    return fail("booking_failed", bookingError?.message ?? "Could not create the booking.");
  }

  if (
    !(await setVehicleStatus(
      target.id,
      "ready_for_sale",
      sell ? "sold" : "reserved",
      context.userId,
    ))
  ) {
    await admin.from("reservations").delete().eq("id", booking.id);
    await rollback();
    return fail("not_available", "Vehicle status changed. Try again.", {
      vehicleId: "bookings.errors.notAvailable",
    });
  }

  alertBookingEvent(sell ? "sold" : "created", booking.id, context.userId);
  return { data: { id: booking.id }, error: null };
}

export async function updateBooking(
  id: string,
  action: Exclude<BookingActionValues, { action: "edit" }>,
  context: UserContext,
): Promise<Result<true>> {
  const supabase = await createClient();
  const { data: bookingRow } = await supabase
    .from("reservations")
    .select(
      "id, status, vehicle_id, created_by, salesperson_id, amount, selling_price, vehicles(quantity)",
    )
    .eq("id", id)
    .maybeSingle();
  const booking = bookingRow as unknown as {
    id: string;
    status: string;
    vehicle_id: string;
    created_by: string | null;
    salesperson_id: string | null;
    amount: number | string;
    selling_price: number | string | null;
    vehicles: Joined<{ quantity: number | null }>;
  } | null;
  if (!booking) return fail("not_found", "Booking not found.");
  const allowed =
    action.action === "cancel"
      ? canCancelBooking(booking, context)
      : canSellBooking(booking, context);
  if (!allowed) {
    return fail(
      "forbidden",
      ownBookingsOnly(context)
        ? "You can only manage your own bookings."
        : "You do not have permission for this action.",
    );
  }
  if (booking.status !== "active") return fail("not_active", "This booking is no longer active.");

  // Selling records the full balance as received (deposit + balance = total price).
  const total = quantityTotal(
    booking.selling_price == null ? null : Number(booking.selling_price),
    one(booking.vehicles)?.quantity,
  );
  const fullBalance =
    total == null ? 0 : Math.max(0, Math.round((total - Number(booking.amount)) * 100) / 100);

  const patch =
    action.action === "cancel"
      ? {
          status: "cancelled" as const,
          cancelled_at: new Date().toISOString(),
          cancel_reason: action.reason || null,
        }
      : {
          status: "converted" as const,
          balance_received: fullBalance,
          sold_at: new Date().toISOString(),
          sold_by: context.userId,
        };

  // Booking first: a sold vehicle can't move back to booked, but a booking can be re-activated.
  const { error } = await supabase.from("reservations").update(patch).eq("id", id);
  if (error) return fail(error.code ?? "db_error", error.message);

  const nextVehicleStatus = action.action === "cancel" ? "ready_for_sale" : "sold";
  if (
    !(await setVehicleStatus(booking.vehicle_id, "reserved", nextVehicleStatus, context.userId))
  ) {
    await createServiceRoleClient()
      .from("reservations")
      .update({
        status: "active",
        cancelled_at: null,
        cancel_reason: null,
        balance_received: null,
        sold_at: null,
        sold_by: null,
      })
      .eq("id", id);
    return fail("vehicle_state", "The vehicle is no longer booked.");
  }
  // Units split off for this booking rejoin the Ready for sale record they came from.
  if (action.action === "cancel") await mergeReadySplitUnits(booking.vehicle_id);
  alertBookingEvent(action.action === "cancel" ? "cancelled" : "sold", id, context.userId);
  return { data: true, error: null };
}

export async function editBooking(
  id: string,
  values: { deposit: number; sellingPrice: number; notes?: string },
  context: UserContext,
): Promise<Result<true>> {
  const supabase = await createClient();
  const { data: bookingRow } = await supabase
    .from("reservations")
    .select("id, status, vehicle_id, created_by, salesperson_id")
    .eq("id", id)
    .maybeSingle();
  const booking = bookingRow as
    ({ id: string; status: string; vehicle_id: string } & Ownership) | null;
  if (!booking) return fail("not_found", "Booking not found.");
  if (!canEditBooking(booking, context)) {
    return fail(
      "forbidden",
      ownBookingsOnly(context)
        ? "You can only manage your own bookings."
        : "You do not have permission to edit bookings.",
    );
  }
  if (booking.status !== "active") return fail("not_active", "This booking is no longer active.");

  const belowMinimum = await checkMinimumPrice(booking.vehicle_id, values.sellingPrice);
  if (belowMinimum) return belowMinimum;

  const { data, error } = await supabase
    .from("reservations")
    .update({
      amount: values.deposit,
      selling_price: values.sellingPrice,
      notes: values.notes || null,
    })
    .eq("id", id)
    .eq("status", "active")
    .select("id");
  if (error) return fail(error.code ?? "db_error", error.message);
  if ((data?.length ?? 0) === 0) return fail("not_active", "This booking is no longer active.");
  return { data: true, error: null };
}

/**
 * The current (or, once sold, the converted) booking for a vehicle, for the people who
 * may see it: its sales person, Accountants and Super Admins. RLS enforces the same rule.
 */
export async function getVehicleBooking(
  vehicleId: string,
  context: UserContext,
): Promise<VehicleBookingInfo | null> {
  if (!hasPermission(context.permissions, "reservation.view", context.roles)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select(
      "id, reservation_number, status, amount, selling_price, balance_received, sold_at, currency, reserved_at, notes, created_by, salesperson_id, customers(display_name, phone)",
    )
    .eq("vehicle_id", vehicleId)
    .in("status", ["active", "converted"])
    .order("reserved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  type Row = Ownership & {
    id: string;
    reservation_number: string;
    status: BookingStatus;
    amount: number | string;
    selling_price: number | string | null;
    balance_received: number | string | null;
    sold_at: string | null;
    currency: string;
    reserved_at: string;
    notes: string | null;
    customers: Joined<{ display_name: string; phone: string }>;
  };
  const row = data as unknown as Row | null;
  if (!row) return null;
  if (ownBookingsOnly(context) && !isOwnBooking(row, context)) return null;

  const names = await profileNames(
    [row.salesperson_id, row.created_by].filter((id): id is string => Boolean(id)),
  );
  const customer = one(row.customers);
  return {
    id: row.id,
    number: row.reservation_number,
    status: row.status,
    deposit: Number(row.amount),
    sellingPrice: row.selling_price == null ? null : Number(row.selling_price),
    balanceReceived: row.balance_received == null ? null : Number(row.balance_received),
    soldAt: row.sold_at,
    currency: row.currency,
    reservedAt: row.reserved_at,
    notes: row.notes,
    customer: customer ? { name: customer.display_name, phone: customer.phone } : null,
    salesperson: row.salesperson_id ? (names.get(row.salesperson_id) ?? null) : null,
    bookedBy: row.created_by ? (names.get(row.created_by) ?? null) : null,
  };
}

export type BookingDetail = BookingListItem & {
  vehiclePhotoUrl: string | null;
  bookedBy: string | null;
  paymentTerms: PaymentTerms;
};

/** One booking (by its number) with what the booking screen shows. Same visibility rules as the list. */
export async function getBookingDetail(
  number: string,
  context: UserContext,
): Promise<Result<BookingDetail | null>> {
  const [list, terms] = await Promise.all([listBookings(context, { number }), getPaymentTerms()]);
  if (list.error) return list;
  const booking = list.data[0];
  if (!booking) return { data: null, error: null };
  const [photos, names] = await Promise.all([
    booking.vehicle
      ? getPrimaryPhotoUrls([booking.vehicle.id])
      : Promise.resolve(new Map<string, string | null>()),
    profileNames(booking.createdBy ? [booking.createdBy] : []),
  ]);
  return {
    data: {
      ...booking,
      vehiclePhotoUrl: booking.vehicle ? (photos.get(booking.vehicle.id) ?? null) : null,
      bookedBy: booking.createdBy ? (names.get(booking.createdBy) ?? null) : null,
      paymentTerms: terms,
    },
    error: null,
  };
}
