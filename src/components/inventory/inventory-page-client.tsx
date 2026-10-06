"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/feedback/empty-state";
import {
  buildApiQuery,
  hasActiveQuery,
  readPage,
  readPageSize,
  useInventoryUrlState,
} from "@/components/inventory/inventory-query";
import { VehicleFilters } from "@/components/inventory/vehicle-filters";
import { VehicleSummary } from "@/components/inventory/vehicle-summary";
import { VehicleTable } from "@/components/inventory/vehicle-table";
import { PageHeader } from "@/components/layout/page-header";
import { ListPagination } from "@/components/tables/list-pagination";
import { ListSkeleton } from "@/components/tables/list-skeleton";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-permission";
import { useVehicleList } from "@/hooks/use-vehicles";
import { Link } from "@/lib/i18n/navigation";

export function InventoryPageClient() {
  const t = useTranslations("inventory");
  const { can } = usePermission();
  const searchParams = useSearchParams();
  const { update } = useInventoryUrlState();

  const apiQuery = buildApiQuery(searchParams);
  const { data, isLoading, error, refetch, isFetching } = useVehicleList(apiQuery);

  const page = readPage(searchParams);
  const pageSize = readPageSize(searchParams);
  const filtered = hasActiveQuery(searchParams);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          can("vehicle.create") ? (
            <Button nativeButton={false} render={<Link href="/inventory/new" />}>
              {t("actions.add")}
            </Button>
          ) : null
        }
      />

      <VehicleSummary summary={data?.summary} />

      <VehicleFilters />

      {isLoading ? <ListSkeleton /> : null}

      {error ? (
        <EmptyState
          title={t("errors.loadTitle")}
          description={error.message}
          action={
            <Button type="button" variant="outline" onClick={() => refetch()}>
              {t("actions.retry")}
            </Button>
          }
        />
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          title={filtered ? t("empty.filteredTitle") : t("empty.title")}
          description={filtered ? t("empty.filteredHint") : t("empty.hint")}
          action={
            can("vehicle.create") && !filtered ? (
              <Button nativeButton={false} render={<Link href="/inventory/new" />}>
              {t("actions.add")}
            </Button>
            ) : null
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <VehicleTable vehicles={data.items} />

          <ListPagination
            namespace="inventory"
            page={page}
            pageSize={pageSize}
            total={data.total}
            fetching={isFetching}
            onChange={update}
          />
        </>
      ) : null}
    </div>
  );
}
