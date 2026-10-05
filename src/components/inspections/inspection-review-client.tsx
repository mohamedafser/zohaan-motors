"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { InspectionApprovalDialog } from "@/components/inspections/inspection-approval-dialog";
import { InspectionFindingsList } from "@/components/inspections/inspection-findings-list";
import { InspectionProgressBar } from "@/components/inspections/inspection-progress";
import { InspectionResultBadge } from "@/components/inspections/inspection-result-badge";
import { InspectionStatusBadge } from "@/components/inspections/inspection-status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInspection } from "@/hooks/use-inspections";
import { canReviewInspection } from "@/lib/inspections/status-transitions";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export function InspectionReviewClient({ inspectionId }: { inspectionId: string }) {
  const t = useTranslations();
  const query = useInspection(inspectionId);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        title={t("inspections.empty.notFound")}
        description={t("inspections.empty.notFoundHint")}
        action={
          <Link href="/inspections" className={buttonVariants()}>
            {t("inspections.actions.back")}
          </Link>
        }
      />
    );
  }

  const inspection = query.data;
  const reviewable = canReviewInspection(inspection.status);
  const critical = inspection.findings.filter((finding) => finding.isCritical);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("inspections.review.title")}
        description={`${inspection.inspectionNumber} · ${[
          inspection.vehicleYear,
          inspection.vehicleMake,
          inspection.vehicleModel,
        ]
          .filter(Boolean)
          .join(" ")}`}
        actions={
          <>
            <InspectionStatusBadge status={inspection.status} />
            <InspectionResultBadge result={inspection.result} />
            <Link
              href={`/inspections/${inspection.id}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {t("inspections.actions.view")}
            </Link>
          </>
        }
      />

      {!reviewable ? (
        <Alert>
          <AlertTitle>{t("inspections.review.notReviewableTitle")}</AlertTitle>
          <AlertDescription>
            {t("inspections.review.notReviewableBody", {
              status: t(`inspections.status.${inspection.status}`),
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("inspections.review.summary")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <InspectionProgressBar
            completed={inspection.progress.itemsCompleted}
            total={inspection.progress.itemsTotal}
            label={t("inspections.progress.items", {
              completed: inspection.progress.itemsCompleted,
              total: inspection.progress.itemsTotal,
            })}
          />
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground text-xs">
                {t("inspections.fields.failedItems")}
              </dt>
              <dd className="text-sm tabular-nums">{inspection.progress.failedItems}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                {t("inspections.fields.criticalFindings")}
              </dt>
              <dd className="text-sm tabular-nums">{inspection.progress.criticalFindings}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{t("inspections.fields.score")}</dt>
              <dd className="text-sm tabular-nums">
                {inspection.overallScore != null ? `${inspection.overallScore}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                {t("inspections.fields.recommendation")}
              </dt>
              <dd className="text-sm">
                {inspection.recommendation
                  ? t(`inspections.recommendations.${inspection.recommendation}`)
                  : "—"}
              </dd>
            </div>
          </dl>
          {inspection.summary ? (
            <p className="text-sm whitespace-pre-wrap">{inspection.summary}</p>
          ) : null}
        </CardContent>
      </Card>

      {critical.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>{t("inspections.review.criticalTitle")}</AlertTitle>
          <AlertDescription>
            {t("inspections.review.criticalBody", { count: critical.length })}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-base font-semibold">{t("inspections.tabs.findings")}</h2>
        <InspectionFindingsList findings={inspection.findings} />
      </section>

      {reviewable ? (
        <div className="bg-card sticky bottom-3 z-10 flex flex-wrap gap-2 rounded-xl border p-3 shadow-sm">
          <Button
            type="button"
            className="h-12 min-w-36 flex-1"
            onClick={() => setMode("approve")}
          >
            <CheckIcon aria-hidden />
            {t("inspections.actions.approve")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-12 min-w-36 flex-1"
            onClick={() => setMode("reject")}
          >
            <XIcon aria-hidden />
            {t("inspections.actions.reject")}
          </Button>
        </div>
      ) : null}

      {mode ? (
        <InspectionApprovalDialog
          inspectionId={inspection.id}
          mode={mode}
          open={Boolean(mode)}
          onOpenChange={(open) => {
            if (!open) setMode(null);
          }}
          hasCritical={inspection.progress.criticalFindings > 0}
        />
      ) : null}
    </div>
  );
}
