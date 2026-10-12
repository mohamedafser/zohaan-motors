import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CustomersPageClient } from "@/components/customers/customers-page-client";
import { ErrorState } from "@/components/feedback/error-state";
import { requirePagePermission } from "@/lib/auth/authorize";
import { getUserContext } from "@/lib/auth/session";
import { listCustomers } from "@/lib/customers/service";
import { hasPermission } from "@/lib/permissions";
import { canViewAllBookings } from "@/lib/permissions/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const context = await getUserContext();
  return {
    title: t(context && !canViewAllBookings(context.roles) ? "customers.myTitle" : "customers.title"),
  };
}

export default async function CustomersPage() {
  const context = await requirePagePermission("customer.view");
  const result = await listCustomers(context);

  if (!result.data) return <ErrorState />;

  return (
    <CustomersPageClient
      customers={result.data.customers}
      ownOnly={result.data.ownOnly}
      canCreateBooking={hasPermission(context.permissions, "reservation.create", context.roles)}
    />
  );
}
