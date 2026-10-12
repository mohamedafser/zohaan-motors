import { customerOwners, profileNames, type BookingStatus } from "@/lib/bookings/service";
import { canViewAllBookings } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import type { UserContext } from "@/types/auth";

export type CustomerListItem = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  emirate: string | null;
  city: string | null;
  branchName: string | null;
  createdAt: string;
  /** The sales executive this customer belongs to (from their first booking). */
  salesperson: { id: string; name: string } | null;
  bookings: { total: number; active: number; lastAt: string | null };
};

type CustomerRow = {
  id: string;
  customer_code: string;
  display_name: string;
  phone: string;
  email: string | null;
  emirate: string | null;
  city: string | null;
  created_at: string;
  created_by: string | null;
  branches: { name: string } | { name: string }[] | null;
};

type BookingRow = { customer_id: string; status: BookingStatus; reserved_at: string };

/**
 * Customers visible to the caller. Reads use the caller's session, so RLS scopes rows by
 * branch. Roles that only see their own bookings (everyone but Super Admins and
 * Accountants) likewise only see customers they own or created.
 */
export async function listCustomers(context: UserContext) {
  const supabase = await createClient();
  const [customers, bookings, owners] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, customer_code, display_name, phone, email, emirate, city, created_at, created_by, branches(name)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("reservations").select("customer_id, status, reserved_at"),
    customerOwners(),
  ]);
  if (customers.error) {
    return { data: null, error: { code: customers.error.code ?? "db_error", message: customers.error.message } };
  }

  const ownOnly = !canViewAllBookings(context.roles);
  const rows = ((customers.data ?? []) as unknown as CustomerRow[]).filter(
    (c) => !ownOnly || owners.get(c.id) === context.userId || c.created_by === context.userId,
  );

  const stats = new Map<string, CustomerListItem["bookings"]>();
  for (const b of (bookings.data ?? []) as unknown as BookingRow[]) {
    const s = stats.get(b.customer_id) ?? { total: 0, active: 0, lastAt: null };
    s.total += 1;
    if (b.status === "active") s.active += 1;
    if (!s.lastAt || b.reserved_at > s.lastAt) s.lastAt = b.reserved_at;
    stats.set(b.customer_id, s);
  }

  const ownerIds = [...new Set(rows.map((c) => owners.get(c.id)).filter((id): id is string => !!id))];
  const names = await profileNames(ownerIds);

  const data: CustomerListItem[] = rows.map((c) => {
    const ownerId = owners.get(c.id);
    const branch = Array.isArray(c.branches) ? c.branches[0] : c.branches;
    return {
      id: c.id,
      code: c.customer_code,
      name: c.display_name,
      phone: c.phone,
      email: c.email,
      emirate: c.emirate,
      city: c.city,
      branchName: branch?.name ?? null,
      createdAt: c.created_at,
      salesperson: ownerId ? { id: ownerId, name: names.get(ownerId) ?? "—" } : null,
      bookings: stats.get(c.id) ?? { total: 0, active: 0, lastAt: null },
    };
  });

  return { data: { customers: data, ownOnly }, error: null };
}
