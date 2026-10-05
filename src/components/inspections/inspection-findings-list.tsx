"use client";

import { AlertTriangleIcon, ClipboardListIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { InspectionFindingDialog } from "@/components/inspections/inspection-finding-dialog";
import {
  InspectionItemResultBadge,
  InspectionSeverityBadge,
} from "@/components/inspections/inspection-item-result-badge";
import { useAppLocale } from "@/components/inventory/inventory-utils";
import { LoadingButton } from "@/components/shared/loading-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInspectionMutations } from "@/hooks/use-inspections";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";
import type { InspectionFinding } from "@/types/inspection";

export function InspectionFindingsList({
  findings,
  compact = false,
  hideEmpty = false,
  className,
  inspectionId,
  editable = false,
}: {
  findings: InspectionFinding[];
  compact?: boolean;
  hideEmpty?: boolean;
  className?: string;
  inspectionId?: string;
  editable?: boolean;
}) {
  const t = useTranslations();
  const locale = useAppLocale();
  const { can } = usePermission();
  const showCost = can("inspection.cost.view");
  const canManage =
    editable &&
    Boolean(inspectionId) &&
    (can("inspection.finding.edit") || can("inspection.edit"));
  const { deleteFinding } = useInspectionMutations(inspectionId);
  const [editing, setEditing] = useState<InspectionFinding | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<InspectionFinding | null>(null);

  if (findings.length === 0) {
    if (hideEmpty) return null;
    return (
      <EmptyState
        icon={ClipboardListIcon}
        title={t("inspections.empty.findingsTitle")}
        description={t("inspections.empty.findingsHint")}
        className="border-0 py-10"
      />
    );
  }

  const sorted = [...findings].sort((a, b) => {
    if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  async function confirmRemove() {
    if (!inspectionId || !pendingDelete) return;
    try {
      await deleteFinding.mutateAsync(pendingDelete.id);
      toast.success(t("inspections.toasts.findingRemoved"));
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-3",
          compact ? "gap-2" : "sm:grid-cols-2 lg:grid-cols-3",
          className,
        )}
      >
        {sorted.map((finding) => (
          <Card
            key={finding.id}
            className={cn(
              finding.isCritical && "border-rose-600/50 ring-1 ring-rose-600/20",
              compact && "shadow-none",
            )}
          >
            <CardHeader
              className={cn(
                "flex flex-row items-start justify-between gap-3 space-y-0",
                compact ? "px-3 py-2.5 pb-1" : "pb-2",
              )}
            >
              <div className="min-w-0">
                <CardTitle className={compact ? "text-sm" : "text-base"}>{finding.title}</CardTitle>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <InspectionItemResultBadge result={finding.result} />
                  <InspectionSeverityBadge severity={finding.severity} />
                </div>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {finding.isCritical ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangleIcon className="size-3.5" aria-hidden />
                    {t("inspections.detail.critical")}
                  </Badge>
                ) : null}
                {canManage ? (
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => {
                        setEditing(finding);
                        setDialogOpen(true);
                      }}
                    >
                      <PencilIcon className="size-3.5" aria-hidden />
                      <span className="sr-only">{t("inspections.actions.editFinding")}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-rose-700 hover:text-rose-800"
                      onClick={() => setPendingDelete(finding)}
                    >
                      <TrashIcon className="size-3.5" aria-hidden />
                      <span className="sr-only">{t("inspections.actions.removeFinding")}</span>
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className={cn("grid gap-2 text-sm", compact && "px-3 pt-0 pb-3")}>
              {finding.description ? (
                <p className="whitespace-pre-wrap">{finding.description}</p>
              ) : null}
              {finding.recommendedAction ? (
                <p>
                  <span className="text-muted-foreground">
                    {t("inspections.fields.recommendedAction")}:{" "}
                  </span>
                  {finding.recommendedAction}
                </p>
              ) : null}
              {finding.recommendation ? (
                <p>
                  <span className="text-muted-foreground">
                    {t("inspections.fields.recommendation")}:{" "}
                  </span>
                  {t(`inspections.recommendations.${finding.recommendation}`)}
                </p>
              ) : null}
              {showCost && finding.estimatedCost != null ? (
                <p className="tabular-nums">
                  <span className="text-muted-foreground">
                    {t("inspections.fields.estimatedCost")}:{" "}
                  </span>
                  {formatCurrency(finding.estimatedCost, locale, finding.currency)}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {inspectionId ? (
        <InspectionFindingDialog
          inspectionId={inspectionId}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
          finding={editing}
        />
      ) : null}

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteFinding.isPending) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("inspections.dialogs.deleteFinding.title")}</DialogTitle>
            <DialogDescription>
              {t("inspections.dialogs.deleteFinding.description", {
                title: pendingDelete?.title ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteFinding.isPending}
              onClick={() => setPendingDelete(null)}
            >
              {t("inspections.actions.cancel")}
            </Button>
            <LoadingButton
              type="button"
              variant="destructive"
              loading={deleteFinding.isPending}
              onClick={confirmRemove}
            >
              {t("inspections.dialogs.deleteFinding.submit")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
