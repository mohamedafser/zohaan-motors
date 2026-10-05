"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useInspectionMutations } from "@/hooks/use-inspections";
import {
  approveInspectionSchema,
  rejectInspectionSchema,
  type ApproveInspectionValues,
  type RejectInspectionValues,
} from "@/lib/validation/inspection";

type Mode = "approve" | "reject";

function ApprovalForm({
  inspectionId,
  mode,
  hasCritical,
  onDone,
}: {
  inspectionId: string;
  mode: Mode;
  hasCritical: boolean;
  onDone: () => void;
}) {
  const t = useTranslations();
  const { approve, reject } = useInspectionMutations(inspectionId);

  const approveForm = useForm<ApproveInspectionValues>({
    resolver: zodResolver(approveInspectionSchema) as never,
    defaultValues: { note: null, overrideCritical: false },
  });
  const rejectForm = useForm<RejectInspectionValues>({
    resolver: zodResolver(rejectInspectionSchema),
    defaultValues: { reason: "" },
  });
  const overrideCritical = useWatch({
    control: approveForm.control,
    name: "overrideCritical",
  });

  async function submitApprove(values: ApproveInspectionValues) {
    try {
      await approve.mutateAsync(values);
      toast.success(t("inspections.toasts.approved"));
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  async function submitReject(values: RejectInspectionValues) {
    try {
      await reject.mutateAsync(values);
      toast.success(t("inspections.toasts.rejected"));
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  if (mode === "approve") {
    return (
      <form className="grid gap-4" noValidate onSubmit={approveForm.handleSubmit(submitApprove)}>
        <FormField
          label={t("inspections.dialogs.approval.note")}
          htmlFor="inspection-approval-note"
          error={approveForm.formState.errors.note?.message}
        >
          <Textarea
            id="inspection-approval-note"
            rows={3}
            maxLength={500}
            placeholder={t("inspections.dialogs.approval.notePlaceholder")}
            {...approveForm.register("note")}
          />
        </FormField>
        {hasCritical ? (
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={Boolean(overrideCritical)}
              onCheckedChange={(checked) =>
                approveForm.setValue("overrideCritical", checked === true)
              }
            />
            <span>{t("inspections.dialogs.approval.overrideCritical")}</span>
          </label>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            {t("inspections.actions.cancel")}
          </Button>
          <LoadingButton type="submit" loading={approve.isPending}>
            {t("inspections.dialogs.approval.approveSubmit")}
          </LoadingButton>
        </DialogFooter>
      </form>
    );
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={rejectForm.handleSubmit(submitReject)}>
      <FormField
        label={t("inspections.dialogs.approval.reason")}
        htmlFor="inspection-reject-reason"
        error={rejectForm.formState.errors.reason?.message}
      >
        <Textarea
          id="inspection-reject-reason"
          rows={3}
          maxLength={500}
          placeholder={t("inspections.dialogs.approval.reasonPlaceholder")}
          aria-invalid={rejectForm.formState.errors.reason ? true : undefined}
          {...rejectForm.register("reason")}
        />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("inspections.actions.cancel")}
        </Button>
        <LoadingButton type="submit" variant="destructive" loading={reject.isPending}>
          {t("inspections.dialogs.approval.rejectSubmit")}
        </LoadingButton>
      </DialogFooter>
    </form>
  );
}

export function InspectionApprovalDialog({
  inspectionId,
  mode,
  open,
  onOpenChange,
  hasCritical = false,
}: {
  inspectionId: string;
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCritical?: boolean;
}) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "approve"
              ? t("inspections.dialogs.approval.approveTitle")
              : t("inspections.dialogs.approval.rejectTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "approve"
              ? t("inspections.dialogs.approval.approveDescription")
              : t("inspections.dialogs.approval.rejectDescription")}
          </DialogDescription>
        </DialogHeader>
        <ApprovalForm
          inspectionId={inspectionId}
          mode={mode}
          hasCritical={hasCritical}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
