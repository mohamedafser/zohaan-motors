"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useInspectionMutations } from "@/hooks/use-inspections";
import {
  submitInspectionSchema,
  type SubmitInspectionValues,
} from "@/lib/validation/inspection";
import type { InspectionProgress } from "@/types/inspection";
import { INSPECTION_RECOMMENDATIONS, INSPECTION_RESULTS } from "@/types/inspection";

export function InspectionSubmitDialog({
  inspectionId,
  open,
  onOpenChange,
  progress,
  uncheckedSections = [],
  onSubmitted,
}: {
  inspectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: InspectionProgress;
  uncheckedSections?: string[];
  onSubmitted?: () => void;
}) {
  const t = useTranslations();
  const { submit } = useInspectionMutations(inspectionId);
  const incomplete = progress.itemsRemaining > 0 || uncheckedSections.length > 0;
  const form = useForm<SubmitInspectionValues>({
    resolver: zodResolver(submitInspectionSchema) as never,
    defaultValues: {
      result: undefined,
      summary: null,
      recommendation: null,
      notes: null,
      overrideIncomplete: false,
    },
  });
  const resultValue = useWatch({ control: form.control, name: "result" });
  const recommendationValue = useWatch({ control: form.control, name: "recommendation" });
  const overrideIncomplete = useWatch({
    control: form.control,
    name: "overrideIncomplete",
  });

  async function onSubmit(values: SubmitInspectionValues) {
    try {
      await submit.mutateAsync(values);
      toast.success(t("inspections.toasts.submitted"));
      onOpenChange(false);
      onSubmitted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("inspections.dialogs.submit.title")}</DialogTitle>
          <DialogDescription>{t("inspections.dialogs.submit.description")}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 grid gap-2 rounded-xl border p-3 text-sm">
          <p>
            {t("inspections.dialogs.submit.progressSummary", {
              completed: progress.itemsCompleted,
              total: progress.itemsTotal,
            })}
          </p>
          <p>
            {t("inspections.dialogs.submit.failedCount", { count: progress.failedItems })}
          </p>
          <p>
            {t("inspections.dialogs.submit.criticalCount", {
              count: progress.criticalFindings,
            })}
          </p>
        </div>

        {uncheckedSections.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>{t("inspections.dialogs.submit.uncheckedTitle")}</AlertTitle>
            <AlertDescription>
              <p>{t("inspections.dialogs.submit.uncheckedHint")}</p>
              <ul className="mt-2 list-disc ps-5">
                {uncheckedSections.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FormField label={t("inspections.fields.result")} htmlFor="submit-result">
            <SearchableSelect
              id="submit-result"
              value={resultValue ?? ""}
              onValueChange={(value) =>
                form.setValue("result", (value || undefined) as SubmitInspectionValues["result"])
              }
              optional
              searchable={false}
              placeholder={t("inspections.fields.selectPlaceholder")}
              options={INSPECTION_RESULTS.map((result) => ({
                value: result,
                label: t(`inspections.results.${result}`),
              }))}
            />
          </FormField>
          <FormField
            label={t("inspections.fields.recommendation")}
            htmlFor="submit-recommendation"
          >
            <SearchableSelect
              id="submit-recommendation"
              value={recommendationValue ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "recommendation",
                  (value || null) as SubmitInspectionValues["recommendation"],
                )
              }
              optional
              searchable={false}
              placeholder={t("inspections.fields.selectPlaceholder")}
              options={INSPECTION_RECOMMENDATIONS.map((item) => ({
                value: item,
                label: t(`inspections.recommendations.${item}`),
              }))}
            />
          </FormField>
          <FormField label={t("inspections.fields.summary")} htmlFor="submit-summary">
            <Textarea id="submit-summary" rows={3} {...form.register("summary")} />
          </FormField>
          {incomplete ? (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={Boolean(overrideIncomplete)}
                onCheckedChange={(checked) =>
                  form.setValue("overrideIncomplete", checked === true)
                }
              />
              <span>{t("inspections.dialogs.submit.overrideIncomplete")}</span>
            </label>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("inspections.actions.cancel")}
            </Button>
            <LoadingButton type="submit" loading={submit.isPending}>
              {t("inspections.dialogs.submit.submit")}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
