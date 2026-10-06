"use client";

import {
  BadgeCheckIcon,
  CameraIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { InspectionApprovalDialog } from "@/components/inspections/inspection-approval-dialog";
import { InspectionAssignDialog } from "@/components/inspections/inspection-assign-dialog";
import { InspectionCancelDialog } from "@/components/inspections/inspection-cancel-dialog";
import { InspectionFindingsList } from "@/components/inspections/inspection-findings-list";
import { InspectionOutcomeDialog } from "@/components/inspections/inspection-outcome-dialog";
import { InspectionPhotosGrid } from "@/components/inspections/inspection-photos-grid";
import { InspectionProgressBar } from "@/components/inspections/inspection-progress";
import { InspectionReinspectDialog } from "@/components/inspections/inspection-reinspect-dialog";
import {
  InspectionItemResultBadge,
  InspectionSeverityBadge,
} from "@/components/inspections/inspection-item-result-badge";
import { InspectionResultBadge } from "@/components/inspections/inspection-result-badge";
import { InspectionStatusBadge } from "@/components/inspections/inspection-status-badge";
import { InspectionTimeline } from "@/components/inspections/inspection-timeline";
import { PermissionGate } from "@/components/auth/permission-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInspection, useInspectionMutations } from "@/hooks/use-inspections";
import { usePermission } from "@/hooks/use-permission";
import {
  canAssignInspection,
  canEditInspectionChecklist,
  canReviewInspection,
} from "@/lib/inspections/status-transitions";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import type { InspectionDetail } from "@/types/inspection";
import { toast } from "sonner";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  const t = useTranslations();
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("text-sm break-words", empty && "text-muted-foreground")}>
        {empty ? t("inspections.fields.notSet") : value}
      </dd>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

function Overview({ inspection }: { inspection: InspectionDetail }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const date = (value: string | null) => (value ? formatDate(value, locale, "medium") : null);
  const dateTime = (value: string | null) => (value ? formatDate(value, locale, "dateTime") : null);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <DetailCard title={t("inspections.detail.overview")}>
        <DetailItem label={t("inspections.fields.number")} value={inspection.inspectionNumber} />
        <DetailItem
          label={t("inspections.fields.status")}
          value={<InspectionStatusBadge status={inspection.status} />}
        />
        <DetailItem
          label={t("inspections.fields.result")}
          value={<InspectionResultBadge result={inspection.result} />}
        />
        <DetailItem
          label={t("inspections.fields.score")}
          value={inspection.overallScore != null ? `${inspection.overallScore}%` : null}
        />
        <DetailItem
          label={t("inspections.fields.inspectionType")}
          value={t(`inspections.types.${inspection.inspectionType}`)}
        />
        <DetailItem label={t("inspections.fields.template")} value={inspection.templateName} />
        <DetailItem label={t("inspections.fields.branch")} value={inspection.branchName} />
        <DetailItem
          label={t("inspections.fields.vehicle")}
          value={
            <Link
              href={`/inventory/${inspection.vehicleId}`}
              className="underline-offset-4 hover:underline"
            >
              {[inspection.vehicleYear, inspection.vehicleMake, inspection.vehicleModel]
                .filter(Boolean)
                .join(" ") || inspection.vehicleStockNumber}
            </Link>
          }
        />
      </DetailCard>

      <DetailCard title={t("inspections.detail.progress")}>
        <div className="sm:col-span-2">
          <InspectionProgressBar
            completed={inspection.progress.itemsCompleted}
            total={inspection.progress.itemsTotal}
            label={t("inspections.progress.items", {
              completed: inspection.progress.itemsCompleted,
              total: inspection.progress.itemsTotal,
            })}
          />
        </div>
        <DetailItem
          label={t("inspections.fields.criticalFindings")}
          value={inspection.progress.criticalFindings}
        />
        <DetailItem
          label={t("inspections.fields.failedItems")}
          value={inspection.progress.failedItems}
        />
        <DetailItem
          label={t("inspections.fields.photos")}
          value={inspection.progress.photosCount}
        />
        <DetailItem
          label={t("inspections.fields.odometer")}
          value={
            inspection.odometerReading != null
              ? `${inspection.odometerReading} ${inspection.odometerUnit}`
              : null
          }
        />
      </DetailCard>

      <DetailCard title={t("inspections.detail.assignment")}>
        <DetailItem label={t("inspections.fields.assignedTo")} value={inspection.assignedToName} />
        <DetailItem
          label={t("inspections.fields.inspectedBy")}
          value={inspection.inspectedByName}
        />
        <DetailItem
          label={t("inspections.fields.assignedAt")}
          value={dateTime(inspection.assignedAt)}
        />
        <DetailItem
          label={t("inspections.fields.submittedAt")}
          value={dateTime(inspection.submittedAt)}
        />
      </DetailCard>

      <DetailCard title={t("inspections.sections.notes")}>
        <div className="sm:col-span-2">
          <DetailItem
            label={t("inspections.fields.summary")}
            value={
              inspection.summary ? (
                <span className="whitespace-pre-wrap">{inspection.summary}</span>
              ) : null
            }
          />
        </div>
        <div className="sm:col-span-2">
          <DetailItem
            label={t("inspections.fields.notes")}
            value={
              inspection.notes ? (
                <span className="whitespace-pre-wrap">{inspection.notes}</span>
              ) : null
            }
          />
        </div>
        <DetailItem
          label={t("inspections.fields.recommendation")}
          value={
            inspection.recommendation
              ? t(`inspections.recommendations.${inspection.recommendation}`)
              : null
          }
        />
      </DetailCard>

      <DetailCard title={t("inspections.detail.review")}>
        <DetailItem label={t("inspections.fields.reviewedBy")} value={inspection.reviewedByName} />
        <DetailItem
          label={t("inspections.fields.reviewedAt")}
          value={dateTime(inspection.reviewedAt)}
        />
        <DetailItem label={t("inspections.fields.reviewNote")} value={inspection.reviewNote} />
        <DetailItem
          label={t("inspections.fields.rejectionReason")}
          value={inspection.rejectionReason}
        />
        <DetailItem label={t("inspections.fields.cancelReason")} value={inspection.cancelReason} />
        <DetailItem
          label={t("inspections.fields.approvedAt")}
          value={dateTime(inspection.approvedAt)}
        />
      </DetailCard>

      <DetailCard title={t("inspections.detail.audit")}>
        <DetailItem
          label={t("inspections.fields.createdAt")}
          value={dateTime(inspection.createdAt)}
        />
        <DetailItem label={t("inspections.fields.createdBy")} value={inspection.createdByName} />
        <DetailItem
          label={t("inspections.fields.updatedAt")}
          value={dateTime(inspection.updatedAt)}
        />
        <DetailItem label={t("inspections.fields.updatedBy")} value={inspection.updatedByName} />
        <DetailItem label={t("inspections.fields.startedAt")} value={date(inspection.startedAt)} />
      </DetailCard>
    </div>
  );
}

function ChecklistTab({ inspection }: { inspection: InspectionDetail }) {
  const t = useTranslations();
  return (
    <div className="grid gap-4">
      {inspection.sections.map((section) => {
        const items = inspection.items
          .filter((item) => item.sectionId === section.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span>{section.name}</span>
                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                  {section.itemsCompleted}/{section.itemsTotal}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="bg-muted/20 flex flex-col gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.notes ? (
                        <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <InspectionItemResultBadge result={item.result} />
                      <InspectionSeverityBadge severity={item.severity} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function InspectionDetailClient({ inspectionId }: { inspectionId: string }) {
  const t = useTranslations();
  const query = useInspection(inspectionId);
  const { deletePhoto } = useInspectionMutations(inspectionId);
  const { can } = usePermission();
  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reinspectOpen, setReinspectOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [approvalMode, setApprovalMode] = useState<"approve" | "reject" | null>(null);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);

  const tabs = useMemo(
    () =>
      [
        {
          id: "overview" as const,
          label: t("inspections.tabs.overview"),
          icon: LayoutDashboardIcon,
        },
        {
          id: "checklist" as const,
          label: t("inspections.tabs.checklist"),
          icon: ClipboardListIcon,
        },
        { id: "findings" as const, label: t("inspections.tabs.findings"), icon: TriangleAlertIcon },
        { id: "photos" as const, label: t("inspections.tabs.photos"), icon: CameraIcon },
        { id: "review" as const, label: t("inspections.tabs.review"), icon: ShieldCheckIcon },
        { id: "history" as const, label: t("inspections.tabs.history"), icon: HistoryIcon },
      ] as const,
    [t],
  );

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
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
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RefreshCwIcon aria-hidden />
              {t("common.retry")}
            </Button>
            <Link href="/inspections" className={buttonVariants()}>
              {t("inspections.actions.back")}
            </Link>
          </div>
        }
      />
    );
  }

  const inspection = query.data;
  const title =
    [inspection.vehicleYear, inspection.vehicleMake, inspection.vehicleModel]
      .filter(Boolean)
      .join(" ") || inspection.inspectionNumber;
  const meta = [inspection.inspectionNumber, inspection.vehicleStockNumber, inspection.branchName]
    .filter(Boolean)
    .join(" · ");
  const actionClass = "h-10 md:h-9";
  const canPerform = can("inspection.edit") && canEditInspectionChecklist(inspection.status);
  const canAssign = can("inspection.edit") && canAssignInspection(inspection.status);
  const canReview =
    (can("inspection.approve") || can("inspection.review")) &&
    canReviewInspection(inspection.status);
  const canCancel =
    can("inspection.edit") && !["approved", "cancelled"].includes(inspection.status);
  const canReinspect =
    (can("inspection.reinspect") || can("inspection.approve")) &&
    (inspection.status === "approved" || inspection.status === "rejected");
  const canUpdateOutcome = can("inspection.approve") && inspection.status === "approved";
  const canRemovePhotos =
    canEditInspectionChecklist(inspection.status) &&
    (can("inspection.photo.delete") || can("inspection.edit"));
  const hasMoreActions = canAssign || canReview || canUpdateOutcome || canReinspect || canCancel;
  const progressPct =
    inspection.progress.itemsTotal > 0
      ? Math.round((inspection.progress.itemsCompleted / inspection.progress.itemsTotal) * 100)
      : 0;

  async function handleRemovePhoto(photoId: string) {
    setRemovingPhotoId(photoId);
    try {
      await deletePhoto.mutateAsync(photoId);
      toast.success(t("inspections.toasts.photoRemoved"));
    } finally {
      setRemovingPhotoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        description={meta || undefined}
        actions={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <InspectionStatusBadge status={inspection.status} />
              <InspectionResultBadge result={inspection.result} />
            </div>
            {canPerform ? (
              <PermissionGate permission="inspection.edit">
                <Link
                  href={`/inspections/${inspection.id}/edit`}
                  className={cn(buttonVariants(), actionClass)}
                >
                  <PencilIcon aria-hidden />
                  {t("inspections.actions.perform")}
                </Link>
              </PermissionGate>
            ) : null}
            {canReview ? (
              <Link
                href={`/inspections/${inspection.id}/review`}
                className={cn(
                  buttonVariants(canPerform ? { variant: "outline" } : undefined),
                  actionClass,
                )}
              >
                <ClipboardCheckIcon aria-hidden />
                {t("inspections.actions.review")}
              </Link>
            ) : null}
            {canUpdateOutcome && !canPerform && !canReview ? (
              <Button className={actionClass} onClick={() => setOutcomeOpen(true)}>
                <BadgeCheckIcon aria-hidden />
                {t("inspections.actions.updateOutcome")}
              </Button>
            ) : null}
            {hasMoreActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 md:h-9 md:w-9"
                      aria-label={t("nav.more")}
                    />
                  }
                >
                  <MoreHorizontalIcon aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  {canAssign ? (
                    <DropdownMenuItem onClick={() => setAssignOpen(true)}>
                      <UserPlusIcon aria-hidden />
                      {t("inspections.actions.assign")}
                    </DropdownMenuItem>
                  ) : null}
                  {canReview ? (
                    <>
                      <DropdownMenuItem onClick={() => setApprovalMode("approve")}>
                        <CheckIcon aria-hidden />
                        {t("inspections.actions.approve")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setApprovalMode("reject")}
                      >
                        <XIcon aria-hidden />
                        {t("inspections.actions.reject")}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  {canUpdateOutcome ? (
                    <DropdownMenuItem onClick={() => setOutcomeOpen(true)}>
                      <BadgeCheckIcon aria-hidden />
                      {t("inspections.actions.updateOutcome")}
                    </DropdownMenuItem>
                  ) : null}
                  {canReinspect ? (
                    <DropdownMenuItem onClick={() => setReinspectOpen(true)}>
                      <RotateCcwIcon aria-hidden />
                      {t("inspections.actions.reinspect")}
                    </DropdownMenuItem>
                  ) : null}
                  {canCancel ? (
                    <>
                      {(canAssign || canReview || canUpdateOutcome || canReinspect) && (
                        <DropdownMenuSeparator />
                      )}
                      <DropdownMenuItem variant="destructive" onClick={() => setCancelOpen(true)}>
                        <XIcon aria-hidden />
                        {t("inspections.actions.cancelInspection")}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        }
      />

      <section className="bg-card grid gap-3 rounded-2xl border p-4 shadow-none sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium tracking-tight">{t("inspections.detail.progress")}</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {t("inspections.progress.items", {
                completed: inspection.progress.itemsCompleted,
                total: inspection.progress.itemsTotal,
              })}
              {" · "}
              {progressPct}%
            </p>
          </div>
          <InspectionProgressBar
            completed={inspection.progress.itemsCompleted}
            total={inspection.progress.itemsTotal}
          />
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm sm:justify-end">
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground text-xs">{t("inspections.fields.score")}</dt>
            <dd className="font-medium tabular-nums">
              {inspection.overallScore != null ? `${inspection.overallScore}%` : "—"}
            </dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground text-xs">
              {t("inspections.fields.criticalFindings")}
            </dt>
            <dd
              className={cn(
                "font-medium tabular-nums",
                inspection.progress.criticalFindings > 0 && "text-rose-700 dark:text-rose-300",
              )}
            >
              {inspection.progress.criticalFindings}
            </dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground text-xs">{t("inspections.fields.failedItems")}</dt>
            <dd className="font-medium tabular-nums">{inspection.progress.failedItems}</dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground text-xs">{t("inspections.fields.photos")}</dt>
            <dd className="font-medium tabular-nums">{inspection.progress.photosCount}</dd>
          </div>
        </dl>
      </section>

      <Tabs defaultValue="overview" className="gap-4">
        <div
          className={cn(
            "bg-background/95 supports-backdrop-filter:bg-background/90 sticky z-10 border-b backdrop-blur-md",
            // Cancel #main py-5 / lg:py-8 so the bar sits flush under the app header.
            "-top-5 -mx-4 px-4 py-2 md:-mx-6 md:px-6 lg:-top-8 lg:-mx-8 lg:px-8",
          )}
        >
          <div className="bg-muted/40 overflow-x-auto rounded-2xl border p-1.5">
            <TabsList
              variant="default"
              className="h-auto w-max min-w-full justify-start gap-1 bg-transparent p-0"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "h-10 shrink-0 rounded-xl px-3.5 text-sm font-medium",
                      "data-active:bg-background data-active:text-foreground data-active:shadow-sm",
                      "dark:data-active:bg-background",
                    )}
                  >
                    <Icon data-icon="inline-start" aria-hidden />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="outline-none">
          <Overview inspection={inspection} />
        </TabsContent>
        <TabsContent value="checklist" className="outline-none">
          <ChecklistTab inspection={inspection} />
        </TabsContent>
        <TabsContent value="findings" className="outline-none">
          <div className="grid gap-4">
            <InspectionFindingsList
              findings={inspection.findings}
              className="sm:grid-cols-2 lg:grid-cols-3"
            />
          </div>
        </TabsContent>
        <TabsContent value="photos" className="outline-none">
          <InspectionPhotosGrid
            photos={inspection.photos}
            canRemove={canRemovePhotos}
            removingId={removingPhotoId}
            onRemove={handleRemovePhoto}
          />
        </TabsContent>
        <TabsContent value="review" className="outline-none">
          <DetailCard title={t("inspections.detail.review")}>
            <DetailItem
              label={t("inspections.fields.reviewedBy")}
              value={inspection.reviewedByName}
            />
            <DetailItem label={t("inspections.fields.reviewNote")} value={inspection.reviewNote} />
            <DetailItem
              label={t("inspections.fields.rejectionReason")}
              value={inspection.rejectionReason}
            />
            <DetailItem
              label={t("inspections.fields.result")}
              value={<InspectionResultBadge result={inspection.result} />}
            />
          </DetailCard>
        </TabsContent>
        <TabsContent value="history" className="outline-none">
          <InspectionTimeline inspectionId={inspection.id} />
        </TabsContent>
      </Tabs>

      <InspectionAssignDialog
        inspectionId={inspection.id}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        currentAssignee={inspection.assignedTo}
      />
      <InspectionCancelDialog
        inspectionId={inspection.id}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
      <InspectionReinspectDialog
        inspectionId={inspection.id}
        open={reinspectOpen}
        onOpenChange={setReinspectOpen}
      />
      <InspectionOutcomeDialog
        inspectionId={inspection.id}
        vehicleId={inspection.vehicleId}
        open={outcomeOpen}
        onOpenChange={setOutcomeOpen}
        currentResult={inspection.result}
        hasCritical={inspection.progress.criticalFindings > 0}
      />
      {approvalMode ? (
        <InspectionApprovalDialog
          inspectionId={inspection.id}
          mode={approvalMode}
          open={Boolean(approvalMode)}
          onOpenChange={(open) => {
            if (!open) setApprovalMode(null);
          }}
          hasCritical={inspection.progress.criticalFindings > 0}
        />
      ) : null}
    </div>
  );
}
