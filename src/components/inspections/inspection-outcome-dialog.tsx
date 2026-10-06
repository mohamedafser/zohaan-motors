"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useInspectionMutations } from "@/hooks/use-inspections";
import { useVehicle } from "@/hooks/use-vehicles";
import { isValidVehicleStatusTransition } from "@/lib/vehicles/status-transitions";
import {
  UPDATE_OUTCOME_VEHICLE_STATUSES,
  updateInspectionOutcomeSchema,
  type UpdateInspectionOutcomeValues,
} from "@/lib/validation/inspection";
import { INSPECTION_RESULTS, type InspectionResult } from "@/types/inspection";

function suggestedVehicleStatus(
  result: InspectionResult | undefined,
  hasCritical: boolean,
): UpdateInspectionOutcomeValues["vehicleStatus"] {
  if (result === "fail") return "inspection_failed";
  if (result === "repair_required") return "under_repair";
  if (result === "pass" || result === "pass_with_advisories") {
    return hasCritical ? "under_repair" : "ready_for_sale";
  }
  return "under_inspection";
}

export function InspectionOutcomeDialog({
  inspectionId,
  vehicleId,
  open,
  onOpenChange,
  currentResult,
  hasCritical,
}: {
  inspectionId: string;
  vehicleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentResult: InspectionResult | null;
  hasCritical: boolean;
}) {
  const t = useTranslations();
  const vehicleQuery = useVehicle(vehicleId);
  const { updateOutcome } = useInspectionMutations(inspectionId);
  const currentVehicleStatus = vehicleQuery.data?.status ?? null;

  const defaultResult = currentResult ?? undefined;
  const defaultVehicleStatus = suggestedVehicleStatus(defaultResult, hasCritical);

  const form = useForm<UpdateInspectionOutcomeValues>({
    resolver: zodResolver(updateInspectionOutcomeSchema) as never,
    defaultValues: {
      result: defaultResult,
      vehicleStatus: defaultVehicleStatus,
      note: null,
      overrideCritical: false,
    },
  });
  const resultValue = useWatch({ control: form.control, name: "result" });
  const vehicleStatusValue = useWatch({ control: form.control, name: "vehicleStatus" });
  const overrideCritical = useWatch({ control: form.control, name: "overrideCritical" });
  const needsOverride =
    hasCritical && (resultValue === "pass" || resultValue === "pass_with_advisories");

  useEffect(() => {
    if (!open) return;
    const nextResult = currentResult ?? undefined;
    form.reset({
      result: nextResult,
      vehicleStatus: suggestedVehicleStatus(nextResult, hasCritical),
      note: null,
      overrideCritical: false,
    });
  }, [currentResult, form, hasCritical, open]);

  const vehicleOptions = useMemo(() => {
    const current = currentVehicleStatus;
    return UPDATE_OUTCOME_VEHICLE_STATUSES.filter((status) => {
      if (!current) return true;
      if (status === current) return true;
      return isValidVehicleStatusTransition(current, status);
    }).map((status) => ({
      value: status,
      label: t(`inventory.status.${status}`),
    }));
  }, [currentVehicleStatus, t]);

  async function onSubmit(values: UpdateInspectionOutcomeValues) {
    try {
      await updateOutcome.mutateAsync(values);
      toast.success(t("inspections.toasts.outcomeUpdated"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("inspections.dialogs.outcome.title")}</DialogTitle>
          <DialogDescription>{t("inspections.dialogs.outcome.description")}</DialogDescription>
        </DialogHeader>

        {vehicleQuery.isPending ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : (
          <Alert>
            <AlertTitle>{t("inspections.dialogs.outcome.currentTitle")}</AlertTitle>
            <AlertDescription>
              {t("inspections.dialogs.outcome.currentHint", {
                inspection: currentResult
                  ? t(`inspections.results.${currentResult}`)
                  : t("inspections.dialogs.outcome.noResult"),
                vehicle: currentVehicleStatus
                  ? t(`inventory.status.${currentVehicleStatus}`)
                  : t("inspections.dialogs.outcome.unknownVehicle"),
              })}
            </AlertDescription>
          </Alert>
        )}

        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            label={t("inspections.dialogs.outcome.inspectionStatus")}
            htmlFor="outcome-result"
            error={form.formState.errors.result?.message}
          >
            <SearchableSelect
              id="outcome-result"
              value={resultValue ?? ""}
              onValueChange={(value) => {
                const next = (value || undefined) as UpdateInspectionOutcomeValues["result"];
                form.setValue("result", next, { shouldValidate: true });
                if (next) {
                  form.setValue("vehicleStatus", suggestedVehicleStatus(next, hasCritical), {
                    shouldValidate: true,
                  });
                }
              }}
              searchable={false}
              placeholder={t("inspections.fields.selectPlaceholder")}
              options={INSPECTION_RESULTS.map((result) => ({
                value: result,
                label: t(`inspections.results.${result}`),
              }))}
            />
          </FormField>

          <FormField
            label={t("inspections.dialogs.outcome.vehicleStatus")}
            htmlFor="outcome-vehicle-status"
            error={form.formState.errors.vehicleStatus?.message}
          >
            <SearchableSelect
              id="outcome-vehicle-status"
              value={vehicleStatusValue ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "vehicleStatus",
                  value as UpdateInspectionOutcomeValues["vehicleStatus"],
                  { shouldValidate: true },
                )
              }
              searchable={false}
              placeholder={t("inspections.fields.selectPlaceholder")}
              options={vehicleOptions}
            />
          </FormField>

          <FormField label={t("inspections.dialogs.outcome.note")} htmlFor="outcome-note">
            <Textarea
              id="outcome-note"
              rows={3}
              placeholder={t("inspections.dialogs.outcome.notePlaceholder")}
              {...form.register("note")}
            />
          </FormField>

          {needsOverride ? (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={Boolean(overrideCritical)}
                onCheckedChange={(checked) =>
                  form.setValue("overrideCritical", checked === true)
                }
              />
              <span>{t("inspections.dialogs.outcome.overrideCritical")}</span>
            </label>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("inspections.actions.cancel")}
            </Button>
            <LoadingButton
              type="submit"
              loading={updateOutcome.isPending}
              disabled={needsOverride && !overrideCritical}
            >
              {t("inspections.dialogs.outcome.submit")}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
