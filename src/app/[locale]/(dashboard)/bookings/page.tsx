import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BookingsPageClient } from "@/components/bookings/bookings-page-client";
import { requirePagePermission } from "@/lib/auth/authorize";
import { listBookings } from "@/lib/bookings/service";
import { getUserContext } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/permissions";
import { canViewAllBookings } from "@/lib/permissions/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const context = await getUserContext();
  return { title: t(context && !canViewAllBookings(context.roles) ? "bookings.myTitle" : "bookings.title") };
}

export default async function BookingsPage() {
  const context = await requirePagePermission("reservation.view");
  const can = (p: Permission) => hasPermission(context.permissions, p, context.roles);
  const result = await listBookings(context);

  return (
    <BookingsPageClient
      initialBookings={result.data ?? []}
      canCreate={can("reservation.create")}
      canCreateCustomer={can("customer.create")}
      ownOnly={!canViewAllBookings(context.roles)}
    />
  );
}
