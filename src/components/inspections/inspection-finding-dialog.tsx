"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { useInspectionMutations } from "@/hooks/use-inspections";
import { usePermission } from "@/hooks/use-permission";
import {
  inspectionFindingSchema,
  type InspectionFindingValues,
} from "@/lib/validation/inspection";
import {
  INSPECTION_DAMAGE_LOCATIONS,
  INSPECTION_DAMAGE_TYPES,
  INSPECTION_ITEM_RESULTS,
  INSPECTION_RECOMMENDATIONS,
  INSPECTION_SEVERITIES,
  type InspectionFinding,
} from "@/types/inspection";

export function InspectionFindingDialog({
  inspectionId,
  open,
  onOpenChange,
  defaults,
  finding,
}: {
  inspectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: Partial<InspectionFindingValues>;
  finding?: InspectionFinding | null;
}) {
  const t = useTranslations();
  const { can } = usePermission();
  const showCost = can("inspection.cost.view");
  const { addFinding, updateFinding } = useInspectionMutations(inspectionId);
  const isEdit = Boolean(finding);

  const form = useForm<InspectionFindingValues>({
    resolver: zodResolver(inspectionFindingSchema) as never,
    defaultValues: {
      inspectionItemId: null,
      sectionId: null,
      result: "fail",
      severity: "moderate",
      title: "",
      description: null,
      recommendedAction: null,
      recommendation: null,
      estimatedCost: null,
      currency: "AED",
      damageType: null,
      damageLocation: null,
      isResolved: false,
    },
  });

  const syncDefaults = useEffectEvent(() => {
    form.reset({
      inspectionItemId: finding?.inspectionItemId ?? defaults?.inspectionItemId ?? null,
      sectionId: finding?.sectionId ?? defaults?.sectionId ?? null,
      result: finding?.result ?? defaults?.result ?? "fail",
      severity: finding?.severity ?? defaults?.severity ?? "moderate",
      title: finding?.title ?? defaults?.title ?? "",
      description: finding?.description ?? defaults?.description ?? null,
      recommendedAction: finding?.recommendedAction ?? defaults?.recommendedAction ?? null,
      recommendation: finding?.recommendation ?? defaults?.recommendation ?? null,
      estimatedCost: finding?.estimatedCost ?? defaults?.estimatedCost ?? null,
      currency: finding?.currency ?? defaults?.currency ?? "AED",
      damageType: finding?.damageType ?? defaults?.damageType ?? null,
      damageLocation: finding?.damageLocation ?? defaults?.damageLocation ?? null,
      isResolved: finding?.isResolved ?? defaults?.isResolved ?? false,
    });
  });

  useEffect(() => {
    if (!open) return;
    syncDefaults();
  }, [open, finding?.id, defaults?.inspectionItemId, defaults?.sectionId, defaults?.title]);

  async function onSubmit(values: InspectionFindingValues) {
    try {
      const payload = {
        ...values,
        inspectionItemId:
          finding?.inspectionItemId ??
          defaults?.inspectionItemId ??
          values.inspectionItemId ??
          null,
        sectionId: finding?.sectionId ?? defaults?.sectionId ?? values.sectionId ?? null,
      };

      if (isEdit && finding) {
        await updateFinding.mutateAsync({ findingId: finding.id, body: payload });
        toast.success(t("inspections.toasts.findingUpdated"));
      } else {
        await addFinding.mutateAsync(payload);
        toast.success(t("inspections.toasts.findingAdded"));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  const saving = addFinding.isPending || updateFinding.isPending;
  const { isDirty } = form.formState;
  const updateDisabled = isEdit && !isDirty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("inspections.dialogs.finding.editTitle")
              : t("inspections.dialogs.finding.title")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("inspections.dialogs.finding.editDescription")
              : t("inspections.dialogs.finding.description")}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            label={t("inspections.fields.findingTitle")}
            htmlFor="finding-title"
            error={form.formState.errors.title?.message}
          >
            <Input id="finding-title" {...form.register("title")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("inspections.fields.itemResult")} htmlFor="finding-result">
              <Controller
                control={form.control}
                name="result"
                render={({ field }) => (
                  <SearchableSelect
                    id="finding-result"
                    value={field.value}
                    onValueChange={field.onChange}
                    searchable={false}
                    options={INSPECTION_ITEM_RESULTS.map((result) => ({
                      value: result,
                      label: t(`inspections.itemResults.${result}`),
                    }))}
                  />
                )}
              />
            </FormField>
            <FormField label={t("inspections.fields.severity")} htmlFor="finding-severity">
              <Controller
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <SearchableSelect
                    id="finding-severity"
                    value={field.value}
                    onValueChange={field.onChange}
                    searchable={false}
                    options={INSPECTION_SEVERITIES.map((severity) => ({
                      value: severity,
                      label: t(`inspections.severities.${severity}`),
                    }))}
                  />
                )}
              />
            </FormField>
          </div>
          <FormField label={t("inspections.fields.description")} htmlFor="finding-description">
            <Textarea id="finding-description" rows={3} {...form.register("description")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("inspections.fields.damageType")} htmlFor="finding-damage-type">
              <Controller
                control={form.control}
                name="damageType"
                render={({ field }) => (
                  <SearchableSelect
                    id="finding-damage-type"
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange(value || null)}
                    optional
                    searchable={false}
                    placeholder={t("inspections.fields.selectPlaceholder")}
                    options={INSPECTION_DAMAGE_TYPES.map((type) => ({
                      value: type,
                      label: t(`inspections.damageTypes.${type}`),
                    }))}
                  />
                )}
              />
            </FormField>
            <FormField
              label={t("inspections.fields.damageLocation")}
              htmlFor="finding-damage-location"
            >
              <Controller
                control={form.control}
                name="damageLocation"
                render={({ field }) => (
                  <SearchableSelect
                    id="finding-damage-location"
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange(value || null)}
                    optional
                    searchable={false}
                    placeholder={t("inspections.fields.selectPlaceholder")}
                    options={INSPECTION_DAMAGE_LOCATIONS.map((location) => ({
                      value: location,
                      label: t(`inspections.damageLocations.${location}`),
                    }))}
                  />
                )}
              />
            </FormField>
          </div>
          <FormField
            label={t("inspections.fields.recommendation")}
            htmlFor="finding-recommendation"
          >
            <Controller
              control={form.control}
              name="recommendation"
              render={({ field }) => (
                <SearchableSelect
                  id="finding-recommendation"
                  value={field.value ?? ""}
                  onValueChange={(value) => field.onChange(value || null)}
                  optional
                  searchable={false}
                  placeholder={t("inspections.fields.selectPlaceholder")}
                  options={INSPECTION_RECOMMENDATIONS.map((item) => ({
                    value: item,
                    label: t(`inspections.recommendations.${item}`),
                  }))}
                />
              )}
            />
          </FormField>
          {showCost ? (
            <FormField label={t("inspections.fields.estimatedCost")} htmlFor="finding-cost">
              <Input
                id="finding-cost"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                {...form.register("estimatedCost")}
              />
            </FormField>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("inspections.actions.cancel")}
            </Button>
            <LoadingButton
              type="submit"
              loading={saving}
              disabled={updateDisabled}
              title={updateDisabled ? t("inspections.actions.noChangesHint") : undefined}
            >
              {isEdit
                ? t("inspections.dialogs.finding.updateSubmit")
                : t("inspections.dialogs.finding.submit")}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
