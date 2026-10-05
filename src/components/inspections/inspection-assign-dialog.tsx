"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { USER_ICON } from "@/components/inspections/inspection-select-icons";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { useInspectionMeta, useInspectionMutations } from "@/hooks/use-inspections";
import {
  assignInspectionSchema,
  type AssignInspectionValues,
} from "@/lib/validation/inspection";

export function InspectionAssignDialog({
  inspectionId,
  open,
  onOpenChange,
  currentAssignee,
}: {
  inspectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignee?: string | null;
}) {
  const t = useTranslations();
  const meta = useInspectionMeta();
  const { assign } = useInspectionMutations(inspectionId);
  const form = useForm<AssignInspectionValues>({
    resolver: zodResolver(assignInspectionSchema) as never,
    defaultValues: { assignedTo: currentAssignee ?? "", reason: null },
  });

  async function onSubmit(values: AssignInspectionValues) {
    try {
      await assign.mutateAsync(values);
      toast.success(t("inspections.toasts.assigned"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inspections.dialogs.assign.title")}</DialogTitle>
          <DialogDescription>{t("inspections.dialogs.assign.description")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            label={t("inspections.fields.assignedTo")}
            htmlFor="assign-inspector"
            error={form.formState.errors.assignedTo?.message}
          >
            <Controller
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <SearchableSelect
                  id="assign-inspector"
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("inspections.fields.selectPlaceholder")}
                  options={(meta.data?.inspectors ?? []).map((inspector) => ({
                    value: inspector.id,
                    label: inspector.name,
                    icon: USER_ICON,
                  }))}
                />
              )}
            />
          </FormField>
          <FormField
            label={t("inspections.dialogs.assign.reason")}
            htmlFor="assign-reason"
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="assign-reason"
              rows={3}
              placeholder={t("inspections.dialogs.assign.reasonPlaceholder")}
              {...form.register("reason")}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("inspections.actions.cancel")}
            </Button>
            <LoadingButton type="submit" loading={assign.isPending}>
              {t("inspections.dialogs.assign.submit")}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
