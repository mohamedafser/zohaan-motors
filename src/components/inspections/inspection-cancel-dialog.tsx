"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
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
  cancelInspectionSchema,
  type CancelInspectionValues,
} from "@/lib/validation/inspection";

export function InspectionCancelDialog({
  inspectionId,
  open,
  onOpenChange,
}: {
  inspectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const { cancel } = useInspectionMutations(inspectionId);
  const form = useForm<CancelInspectionValues>({
    resolver: zodResolver(cancelInspectionSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: CancelInspectionValues) {
    try {
      await cancel.mutateAsync(values);
      toast.success(t("inspections.toasts.cancelled"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inspections.dialogs.cancel.title")}</DialogTitle>
          <DialogDescription>{t("inspections.dialogs.cancel.description")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            label={t("inspections.dialogs.cancel.reason")}
            htmlFor="cancel-reason"
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="cancel-reason"
              rows={3}
              placeholder={t("inspections.dialogs.cancel.reasonPlaceholder")}
              aria-invalid={form.formState.errors.reason ? true : undefined}
              {...form.register("reason")}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("inspections.actions.cancel")}
            </Button>
            <LoadingButton type="submit" variant="destructive" loading={cancel.isPending}>
              {t("inspections.dialogs.cancel.submit")}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
