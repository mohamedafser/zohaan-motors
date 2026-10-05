"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import {
  BRANCH_ICON,
  INSPECTION_TYPE_ICONS,
  USER_ICON,
} from "@/components/inspections/inspection-select-icons";
import { ErrorState } from "@/components/feedback/error-state";
import { FormField } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useInspectionMeta } from "@/hooks/use-inspections";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  createInspectionSchema,
  type CreateInspectionValues,
} from "@/lib/validation/inspection";
import { INSPECTION_TYPES } from "@/types/inspection";

type FormInput = z.input<typeof createInspectionSchema>;

export type InspectionFormProps = {
  submitting?: boolean;
  fieldErrors?: Record<string, string>;
  formError?: ReactNode;
  cancelHref: string;
  defaultVehicleId?: string;
  onSubmit: (values: CreateInspectionValues) => Promise<void> | void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

export function InspectionForm({
  submitting,
  fieldErrors,
  formError,
  cancelHref,
  defaultVehicleId,
  onSubmit,
}: InspectionFormProps) {
  const t = useTranslations();
  const meta = useInspectionMeta();

  const form = useForm<FormInput, unknown, CreateInspectionValues>({
    resolver: zodResolver(createInspectionSchema) as never,
    defaultValues: {
      vehicleId: defaultVehicleId ?? "",
      branchId: "",
      templateId: "",
      inspectionType: "full_inspection",
      assignedTo: "",
      odometerReading: "",
      odometerUnit: "KM",
      notes: "",
      parentInspectionId: "",
    },
  });

  const inspectionType = useWatch({ control: form.control, name: "inspectionType" });
  const vehicleId = useWatch({ control: form.control, name: "vehicleId" });

  const vehicles = meta.data?.vehicles ?? [];
  const templates = useMemo(() => {
    const all = meta.data?.templates ?? [];
    return all.filter(
      (template) =>
        template.isActive &&
        (!inspectionType || template.inspectionType === inspectionType),
    );
  }, [meta.data?.templates, inspectionType]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);

  if (meta.isPending) {
    return (
      <div className="grid gap-4" aria-busy>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (meta.isError) {
    return <ErrorState onRetry={() => void meta.refetch()} />;
  }

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      {formError ? (
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <Section title={t("inspections.sections.vehicle")}>
        <div className="sm:col-span-2">
          <FormField
            label={t("inspections.fields.vehicle")}
            htmlFor="inspection-vehicle"
            error={form.formState.errors.vehicleId?.message || fieldErrors?.vehicleId}
          >
            <Controller
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <SearchableSelect
                  id="inspection-vehicle"
                  value={field.value ?? ""}
                  onValueChange={(value) => {
                    field.onChange(value);
                    const vehicle = vehicles.find((item) => item.id === value);
                    if (vehicle) {
                      form.setValue("branchId", vehicle.branchId);
                      if (vehicle.mileage != null) {
                        form.setValue("odometerReading", vehicle.mileage);
                      }
                    }
                  }}
                  placeholder={t("inspections.fields.selectPlaceholder")}
                  options={vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.stockNumber} · ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                  }))}
                />
              )}
            />
          </FormField>
        </div>
        {selectedVehicle ? (
          <p className="text-muted-foreground sm:col-span-2 text-sm">
            {selectedVehicle.vin
              ? `${t("inspections.fields.vin")}: ${selectedVehicle.vin}`
              : t("inspections.fields.notSet")}
            {" · "}
            {t("inspections.fields.mileage")}: {selectedVehicle.mileage} KM
          </p>
        ) : null}
      </Section>

      <Section title={t("inspections.sections.setup")}>
        <FormField
          label={t("inspections.fields.inspectionType")}
          htmlFor="inspection-type"
          error={form.formState.errors.inspectionType?.message || fieldErrors?.inspectionType}
        >
          <Controller
            control={form.control}
            name="inspectionType"
            render={({ field }) => (
              <SearchableSelect
                id="inspection-type"
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue("templateId", "");
                }}
                searchable={false}
                options={INSPECTION_TYPES.map((type) => ({
                  value: type,
                  label: t(`inspections.types.${type}`),
                  icon: INSPECTION_TYPE_ICONS[type],
                }))}
              />
            )}
          />
        </FormField>

        <FormField
          label={t("inspections.fields.template")}
          htmlFor="inspection-template"
          error={form.formState.errors.templateId?.message || fieldErrors?.templateId}
        >
          <Controller
            control={form.control}
            name="templateId"
            render={({ field }) => (
              <SearchableSelect
                id="inspection-template"
                value={field.value ?? ""}
                onValueChange={field.onChange}
                optional
                placeholder={t("inspections.fields.defaultTemplate")}
                options={templates.map((template) => ({
                  value: template.id,
                  label: template.name,
                }))}
              />
            )}
          />
        </FormField>

        <FormField
          label={t("inspections.fields.branch")}
          htmlFor="inspection-branch"
          error={form.formState.errors.branchId?.message || fieldErrors?.branchId}
        >
          <Controller
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <SearchableSelect
                id="inspection-branch"
                value={field.value ?? ""}
                onValueChange={field.onChange}
                optional
                placeholder={t("inspections.fields.selectPlaceholder")}
                options={(meta.data?.branches ?? []).map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                  icon: BRANCH_ICON,
                }))}
              />
            )}
          />
        </FormField>

        <FormField
          label={t("inspections.fields.assignedTo")}
          htmlFor="inspection-assignee"
          error={form.formState.errors.assignedTo?.message || fieldErrors?.assignedTo}
        >
          <Controller
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <SearchableSelect
                id="inspection-assignee"
                value={field.value ?? ""}
                onValueChange={field.onChange}
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

        <FormField
          label={t("inspections.fields.odometer")}
          htmlFor="inspection-odometer"
          error={form.formState.errors.odometerReading?.message || fieldErrors?.odometerReading}
        >
          <Input
            id="inspection-odometer"
            type="number"
            min={0}
            inputMode="numeric"
            {...form.register("odometerReading")}
          />
        </FormField>

        <FormField
          label={t("inspections.fields.odometerUnit")}
          htmlFor="inspection-odometer-unit"
          error={form.formState.errors.odometerUnit?.message || fieldErrors?.odometerUnit}
        >
          <Input id="inspection-odometer-unit" maxLength={8} {...form.register("odometerUnit")} />
        </FormField>

        <div className="sm:col-span-2">
          <FormField
            label={t("inspections.fields.notes")}
            htmlFor="inspection-notes"
            error={form.formState.errors.notes?.message || fieldErrors?.notes}
          >
            <Textarea id="inspection-notes" rows={3} {...form.register("notes")} />
          </FormField>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref} className={cn(buttonVariants({ variant: "outline" }))}>
          {t("inspections.actions.cancel")}
        </Link>
        <LoadingButton type="submit" loading={submitting}>
          {t("inspections.actions.createSubmit")}
        </LoadingButton>
      </div>
    </form>
  );
}
