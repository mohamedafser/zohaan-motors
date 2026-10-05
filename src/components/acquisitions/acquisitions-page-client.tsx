"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { AcquisitionFilters } from "@/components/acquisitions/acquisition-filters";
import {
  buildApiQuery,
  hasActiveQuery,
  readPage,
  readPageSize,
  useAcquisitionUrlState,
} from "@/components/acquisitions/acquisition-query";
import { AcquisitionSummary } from "@/components/acquisitions/acquisition-summary";
import { AcquisitionTable } from "@/components/acquisitions/acquisition-table";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcquisitionList } from "@/hooks/use-acquisitions";
import { usePermission } from "@/hooks/use-permission";
import { Link } from "@/lib/i18n/navigation";

export function AcquisitionsPageClient() {
  const t = useTranslations("acquisitions");
  const { can } = usePermission();
  const searchParams = useSearchParams();
  const { update } = useAcquisitionUrlState();

  const apiQuery = buildApiQuery(searchParams);
  const { data, isLoading, error, refetch, isFetching } = useAcquisitionList(apiQuery);

  const page = readPage(searchParams);
  const pageSize = readPageSize(searchParams);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const filtered = hasActiveQuery(searchParams);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          can("acquisition.create") ? (
            <Button nativeButton={false} render={<Link href="/inventory/new" />}>
              {t("actions.addViaInventory")}
            </Button>
          ) : null
        }
      />

      {data ? <AcquisitionSummary summary={data.summary} /> : <Skeleton className="h-24 w-full" />}

      <AcquisitionFilters />

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

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
            can("acquisition.create") && !filtered ? (
              <Button nativeButton={false} render={<Link href="/inventory/new" />}>
                {t("actions.addViaInventory")}
              </Button>
            ) : null
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <AcquisitionTable acquisitions={data.items} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              {t("pagination.showing", {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, data.total),
                total: data.total,
              })}
              {isFetching ? ` · ${t("actions.loading")}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
                value={String(pageSize)}
                onChange={(event) => update({ pageSize: event.target.value, page: 1 })}
                aria-label={t("pagination.pageSize")}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => update({ page: page - 1 })}
              >
                {t("pagination.previous")}
              </Button>
              <span className="text-muted-foreground text-xs tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => update({ page: page + 1 })}
              >
                {t("pagination.next")}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
