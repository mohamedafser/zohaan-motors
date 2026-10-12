import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BookingsPageClient } from "@/components/bookings/bookings-page-client";
import { requirePagePermission } from "@/lib/auth/authorize";
import { listBookings } from "@/lib/bookings/service";
import { hasPermission, type Permission } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("bookings.title") };
}

export default async function BookingsPage() {
  const context = await requirePagePermission("reservation.view");
  const can = (p: Permission) => hasPermission(context.permissions, p, context.roles);
  const result = await listBookings();

  return (
    <BookingsPageClient
      initialBookings={result.data ?? []}
      canCreate={can("reservation.create")}
      canCancel={can("reservation.cancel")}
      canSell={can("sale.create") || can("vehicle.status.change")}
      canCreateCustomer={can("customer.create")}
    />
  );
}
