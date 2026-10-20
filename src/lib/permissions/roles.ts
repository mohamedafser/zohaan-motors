/**
 * Sales executives create bookings for their own customers; new customers default to
 * them as the sales person. Super Admins are never treated as sales executives.
 */
export function isSalesExecutive(roles: readonly string[]) {
  return roles.includes("sales_executive") && !roles.includes("super_admin");
}

/**
 * Super Admins and Accountants see every booking; everyone else sees only bookings assigned
 * to them as sales executive, or that they created without one (mirrors
 * public.can_view_all_bookings() and the reservations RLS policies).
 */
export function canViewAllBookings(roles: readonly string[]) {
  return roles.includes("super_admin") || roles.includes("accountant");
}
