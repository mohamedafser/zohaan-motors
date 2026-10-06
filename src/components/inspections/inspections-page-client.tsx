"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { InspectionFilters } from "@/components/inspections/inspection-filters";
import {
  buildApiQuery,
  hasActiveQuery,
  readPage,
  readPageSize,
  useInspectionUrlState,
} from "@/components/inspections/inspection-query";
import { InspectionSummary } from "@/components/inspections/inspection-summary";
import { InspectionTable } from "@/components/inspections/inspection-table";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ListPagination } from "@/components/tables/list-pagination";
import { ListSkeleton } from "@/components/tables/list-skeleton";
import { Button } from "@/components/ui/button";
import { useInspectionList } from "@/hooks/use-inspections";
import { usePermission } from "@/hooks/use-permission";
import { Link } from "@/lib/i18n/navigation";

export function InspectionsPageClient() {
  const t = useTranslations("inspections");
  const { can } = usePermission();
  const searchParams = useSearchParams();
  const { update } = useInspectionUrlState();

  const apiQuery = buildApiQuery(searchParams);
  const { data, isLoading, error, refetch, isFetching } = useInspectionList(apiQuery);

  const page = readPage(searchParams);
  const pageSize = readPageSize(searchParams);
  const filtered = hasActiveQuery(searchParams);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          can("inspection.create") ? (
            <Button nativeButton={false} render={<Link href="/inspections/new" />}>
              {t("actions.add")}
            </Button>
          ) : null
        }
      />

      <InspectionSummary summary={data?.summary} />

      <InspectionFilters />

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
            can("inspection.create") && !filtered ? (
              <Button nativeButton={false} render={<Link href="/inspections/new" />}>
                {t("actions.add")}
              </Button>
            ) : null
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <InspectionTable inspections={data.items} />

          <ListPagination
            namespace="inspections"
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
