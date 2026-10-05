"use client";

import { ArrowRightIcon, HistoryIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { InspectionStatusBadge } from "@/components/inspections/inspection-status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInspectionActivity,
  useInspectionHistory,
} from "@/hooks/use-inspections";
import { formatDate } from "@/lib/utils/date";

function humanizeAction(action: string) {
  const text = action.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function InspectionTimeline({ inspectionId }: { inspectionId: string }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const history = useInspectionHistory(inspectionId);
  const activity = useInspectionActivity(inspectionId);

  if (history.isPending || activity.isPending) {
    return (
      <div className="grid gap-3" aria-busy>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (history.isError || activity.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void history.refetch();
          void activity.refetch();
        }}
      />
    );
  }

  const statusHistory = history.data;
  const activityItems = activity.data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("inspections.history.statusHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {statusHistory.length === 0 ? (
            <EmptyState
              icon={HistoryIcon}
              title={t("inspections.history.noStatus")}
              description={t("inspections.history.noStatusHint")}
              className="border-0 py-8"
            />
          ) : (
            <ol className="border-border relative ms-2 grid gap-5 border-s ps-5">
              {statusHistory.map((item) => (
                <li key={item.id} className="relative">
                  <span
                    className="bg-primary ring-background absolute -start-[27px] top-1.5 size-2.5 rounded-full ring-4"
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {item.fromStatus ? (
                      <>
                        <InspectionStatusBadge status={item.fromStatus} />
                        <ArrowRightIcon
                          className="text-muted-foreground size-3.5 rtl:rotate-180"
                          aria-hidden
                        />
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {t("inspections.history.initial")}
                      </span>
                    )}
                    <InspectionStatusBadge status={item.toStatus} />
                  </div>
                  {item.reason ? <p className="mt-1.5 text-sm">{item.reason}</p> : null}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDate(item.changedAt, locale, "dateTime")} ·{" "}
                    {t("inspections.history.changedBy", {
                      name: item.changedByName ?? t("inspections.history.system"),
                    })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("inspections.history.activity")}</CardTitle>
        </CardHeader>
        <CardContent>
          {activityItems.length === 0 ? (
            <EmptyState
              icon={HistoryIcon}
              title={t("inspections.history.noActivity")}
              description={t("inspections.history.noActivityHint")}
              className="border-0 py-8"
            />
          ) : (
            <ul className="grid gap-4">
              {activityItems.map((item) => (
                <li key={item.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                  <p className="text-sm font-medium">{humanizeAction(item.action)}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatDate(item.createdAt, locale, "dateTime")} ·{" "}
                    {t("inspections.history.changedBy", {
                      name: item.actorName ?? t("inspections.history.system"),
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
