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
import { useRouter } from "@/lib/i18n/navigation";
import { reinspectSchema, type ReinspectValues } from "@/lib/validation/inspection";

export function InspectionReinspectDialog({
  inspectionId,
  open,
  onOpenChange,
}: {
  inspectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const meta = useInspectionMeta();
  const { reinspect } = useInspectionMutations(inspectionId);
  const form = useForm<ReinspectValues>({
    resolver: zodResolver(reinspectSchema) as never,
    defaultValues: { reason: "", assignedTo: null },
  });

  async function onSubmit(values: ReinspectValues) {
    try {
      const created = await reinspect.mutateAsync(values);
      toast.success(t("inspections.toasts.reinspect", { number: created.inspectionNumber }));
      onOpenChange(false);
      router.push(`/inspections/${created.id}/edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inspections.dialogs.reinspect.title")}</DialogTitle>
          <DialogDescription>
            {t("inspections.dialogs.reinspect.description")}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            label={t("inspections.dialogs.reinspect.reason")}
            htmlFor="reinspect-reason"
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="reinspect-reason"
              rows={3}
              placeholder={t("inspections.dialogs.reinspect.reasonPlaceholder")}
              {...form.register("reason")}
            />
          </FormField>
          <FormField
            label={t("inspections.fields.assignedTo")}
            htmlFor="reinspect-assignee"
          >
            <Controller
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <SearchableSelect
                  id="reinspect-assignee"
                  value={field.value ?? ""}
                  onValueChange={(value) => field.onChange(value || null)}
                  optional
                  placeholder={t("inspections.fields.unassigned")}
                  options={(meta.data?.inspectors ?? []).map((inspector) => ({
                    value: inspector.id,
                    label: inspector.name,
                    icon: USER_ICON,
                  }))}
                />
              )}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("inspections.actions.cancel")}
            </Button>
            <LoadingButton type="submit" loading={reinspect.isPending}>
              {t("inspections.dialogs.reinspect.submit")}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
