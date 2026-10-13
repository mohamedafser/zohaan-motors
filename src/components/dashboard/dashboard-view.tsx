import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getDashboard } from "@/lib/dashboard/service";
import { hasPermission } from "@/lib/permissions";
import type { UserContext } from "@/types/auth";

/** Loads the dashboard figures (scoped to what the user may see) and renders them. */
export async function DashboardView({ context }: { context: UserContext }) {
  const data = await getDashboard(context);
  return (
    <DashboardClient
      data={data}
      userName={context.displayName}
      canCreateBooking={hasPermission(context.permissions, "reservation.create", context.roles)}
    />
  );
}
