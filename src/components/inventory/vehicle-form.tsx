"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useImperativeHandle, type ReactNode, type Ref } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { ErrorState } from "@/components/feedback/error-state";
import { FormField } from "@/components/forms/form-field";
import { bodyTypeKey, toDateInputValue } from "@/components/inventory/inventory-utils";
import { VehicleCatalogFields } from "@/components/inventory/vehicle-catalog-fields";
import { VehicleColorField } from "@/components/inventory/vehicle-color-field";
import {
  BRANCH_ICON,
  DRIVE_ICONS,
  FUEL_ICONS,
  LOCATION_ICON,
  MILEAGE_UNIT_ICONS,
  ORIGIN_ICONS,
  TRANSMISSION_ICONS,
  bodyTypeIcon,
} from "@/components/inventory/vehicle-select-icons";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/use-permission";
import { useInventoryMeta } from "@/hooks/use-vehicles";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { countrySelectOptions } from "@/lib/vehicles/countries";
import { vehicleFormSchema, type VehicleFormValues } from "@/lib/validation/vehicle";
import {
  BODY_TYPES,
  DRIVE_TYPES,
  FUEL_TYPES,
  MILEAGE_UNITS,
  ORIGIN_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_MARKET_TYPES,
  type VehicleDetail,
} from "@/types/vehicle";

type VehicleFormInput = z.input<typeof vehicleFormSchema>;
type FieldName = keyof VehicleFormInput;
type InventoryMeta = NonNullable<ReturnType<typeof useInventoryMeta>["data"]>;

export type VehicleFormHandle = {
  validate: () => Promise<VehicleFormValues | null>;
  getValues: () => VehicleFormInput;
};

export type VehicleFormProps = {
  mode: "create" | "edit";
  vehicle?: VehicleDetail;
  submitting?: boolean;
  submittingLabel?: string;
  /** Field errors returned by the API (keyed by field name). */
  fieldErrors?: Record<string, string>;
  formError?: ReactNode;
  cancelHref: string;
  onSubmit: (values: VehicleFormValues) => Promise<void> | void;
  /** Optional content rendered before the sticky submit bar (e.g. photos). */
  extraSections?: ReactNode;
  /** When true, edit mode submit stays enabled even if vehicle fields are unchanged (e.g. acquisition-only edits). */
  allowSubmitWhenClean?: boolean;
  /** Hide sticky cancel/submit — parent owns navigation (e.g. create stepper). */
  hideActions?: boolean;
  ref?: Ref<VehicleFormHandle | null>;
};

function toDefaults(vehicle: VehicleDetail | undefined, branchId: string): VehicleFormInput {
  if (!vehicle) {
    return {
      vin: "",
      chassisNumber: "",
      make: "",
      model: "",
      variant: "",
      year: undefined as unknown as number,
      mileage: 0,
      mileageUnit: "km",
      marketType: "used",
      bodyType: "",
      transmission: null,
      fuelType: null,
      engineSize: "",
      engineCylinders: undefined,
      driveType: null,
      seats: undefined,
      doors: undefined,
      exteriorColor: "",
      interiorColor: "",
      originType: null,
      countryOfOrigin: "",
      branchId,
      locationId: "",
      purchaseDate: "",
      registrationDate: "",
      description: "",
      makeId: "",
      modelId: "",
      modelYearId: "",
      variantId: "",
      customVariant: "",
    };
  }
  return {
    vin: vehicle.vin ?? "",
    chassisNumber: vehicle.chassisNumber ?? "",
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant ?? "",
    year: vehicle.year,
    mileage: vehicle.mileage,
    mileageUnit: vehicle.mileageUnit,
    marketType: vehicle.marketType ?? "used",
    bodyType: vehicle.bodyType ?? "",
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    engineSize: vehicle.engineSize ?? "",
    engineCylinders: vehicle.engineCylinders ?? undefined,
    driveType: vehicle.driveType,
    seats: vehicle.seats ?? undefined,
    doors: vehicle.doors ?? undefined,
    exteriorColor: vehicle.exteriorColor ?? "",
    interiorColor: vehicle.interiorColor ?? "",
    originType: vehicle.originType,
    countryOfOrigin: vehicle.countryOfOrigin ?? "",
    branchId: vehicle.branchId,
    locationId: vehicle.locationId ?? "",
    purchaseDate: toDateInputValue(vehicle.purchaseDate),
    registrationDate: toDateInputValue(vehicle.registrationDate),
    description: vehicle.description ?? "",
    makeId: vehicle.makeId ?? "",
    modelId: vehicle.modelId ?? "",
    modelYearId: vehicle.modelYearId ?? "",
    variantId: vehicle.variantId ?? "",
    customVariant: vehicle.customVariant ?? "",
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</CardContent>
    </Card>
  );
}

function VehicleFormBody({
  mode,
  vehicle,
  meta,
  submitting,
  submittingLabel,
  fieldErrors,
  formError,
  cancelHref,
  onSubmit,
  extraSections,
  allowSubmitWhenClean,
  hideActions = false,
  formRef,
}: VehicleFormProps & { meta: InventoryMeta; formRef?: Ref<VehicleFormHandle | null> }) {
  const t = useTranslations();
  const { user } = usePermission();

  const defaultBranch =
    vehicle?.branchId ??
    (user.branchId && meta.branches.some((branch) => branch.id === user.branchId)
      ? user.branchId
      : meta.branches.length === 1
        ? meta.branches[0].id
        : "");

  const form = useForm<VehicleFormInput, unknown, VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: toDefaults(vehicle, defaultBranch),
  });
  const { errors, isDirty } = form.formState;

  const branchId = useWatch({ control: form.control, name: "branchId" });

  // Resolve catalog ids from legacy text snapshots when FKs are missing.
  useEffect(() => {
    const values = form.getValues();
    if (!values.makeId && values.make) {
      const make = meta.makes.find(
        (item) => item.name.toLowerCase() === values.make.trim().toLowerCase(),
      );
      if (make) form.setValue("makeId", make.id, { shouldDirty: false });
    }
  }, [form, meta.makes]);

  useEffect(() => {
    if (!fieldErrors) return;
    for (const [key, message] of Object.entries(fieldErrors)) {
      form.setError(key as FieldName, { type: "server", message });
    }
  }, [fieldErrors, form]);

  function enrich(values: VehicleFormValues): VehicleFormValues {
    const make = values.makeId
      ? meta.makes.find((item) => item.id === values.makeId)
      : meta.makes.find((item) => item.name.toLowerCase() === values.make.trim().toLowerCase());
    return {
      ...values,
      make: make?.name ?? values.make,
      makeId: values.makeId ?? make?.id ?? null,
      modelId: values.modelId,
      modelYearId: values.modelYearId,
      variantId: values.variantId,
      customVariant: values.customVariant,
      variant: values.customVariant ?? values.variant,
    };
  }

  useImperativeHandle(formRef, () => ({
    validate: () =>
      new Promise((resolve) => {
        void form.handleSubmit(
          (values) => resolve(enrich(values)),
          () => resolve(null),
        )();
      }),
    getValues: () => form.getValues(),
  }));

  const locations = meta.locations.filter((location) => location.branchId === branchId);

  const bodyTypes: string[] = [...BODY_TYPES];
  if (vehicle?.bodyType && !bodyTypes.includes(vehicle.bodyType)) bodyTypes.push(vehicle.bodyType);

  const message = (name: FieldName) => errors[name]?.message as string | undefined;
  const aria = (name: FieldName) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  function textField(
    name: FieldName,
    label: string,
    options: {
      type?: string;
      inputMode?: "numeric" | "text";
      number?: boolean;
      hint?: string;
      list?: string;
      placeholder?: string;
      className?: string;
      autoCapitalize?: string;
      required?: boolean;
    } = {},
  ) {
    return (
      <FormField
        label={label}
        htmlFor={name}
        error={message(name)}
        hint={options.hint}
        required={options.required}
      >
        <Input
          id={name}
          type={options.type}
          inputMode={options.inputMode}
          list={options.list}
          placeholder={options.placeholder}
          autoCapitalize={options.autoCapitalize}
          autoComplete="off"
          className={cn("h-11 md:h-10", options.className)}
          {...aria(name)}
          {...form.register(name, options.number ? { valueAsNumber: true } : undefined)}
        />
      </FormField>
    );
  }

  function selectField(
    name: FieldName,
    label: string,
    options: SearchableSelectOption[],
    config: {
      nullable?: boolean;
      optional?: boolean;
      placeholder?: string;
      searchable?: boolean;
      groupLabel?: (group: string) => string;
      onChange?: () => void;
      required?: boolean;
    } = {},
  ) {
    const optional = config.optional ?? config.nullable ?? config.placeholder !== undefined;
    return (
      <FormField
        label={label}
        htmlFor={name}
        error={message(name)}
        required={config.required ?? !optional}
      >
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <SearchableSelect
              id={name}
              value={field.value == null ? "" : String(field.value)}
              onValueChange={(next) => {
                const value = config.nullable ? (next === "" ? null : next) : next;
                field.onChange(value);
                config.onChange?.();
              }}
              options={options}
              optional={optional}
              searchable={config.searchable}
              placeholder={config.placeholder}
              groupLabel={config.groupLabel}
              aria-invalid={errors[name] ? true : undefined}
              aria-describedby={errors[name] ? `${name}-error` : undefined}
            />
          )}
        />
      </FormField>
    );
  }

  return (
    <form
      className={cn("grid gap-6", !hideActions && "pb-2")}
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(enrich(values));
      })}
    >
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Section title={t("inventory.sections.basic")}>
        <FormField
          label={t("inventory.fields.stockId")}
          htmlFor="stockNumber"
          hint={mode === "create" ? t("inventory.fields.stockIdHint") : undefined}
        >
          <Input
            id="stockNumber"
            readOnly
            disabled
            className="h-11 md:h-10"
            value={mode === "edit" ? (vehicle?.stockNumber ?? "") : ""}
            placeholder={mode === "create" ? t("inventory.fields.stockIdHint") : undefined}
          />
        </FormField>
        {textField("vin", t("inventory.fields.vin"), {
          hint: t("inventory.fields.vinHint"),
          className: "font-mono uppercase",
          autoCapitalize: "characters",
        })}
        {textField("chassisNumber", t("inventory.fields.chassis"), {
          className: "font-mono uppercase",
          autoCapitalize: "characters",
        })}
        <VehicleCatalogFields
          control={form.control}
          setValue={form.setValue}
          makes={meta.makes}
          errors={errors}
          initialCustomVariant={Boolean(vehicle?.customVariant) && !vehicle?.variantId}
        />
        {selectField(
          "marketType",
          t("inventory.fields.marketType"),
          VEHICLE_MARKET_TYPES.map((type) => ({
            value: type,
            label: t(`inventory.enums.marketType.${type}`),
          })),
          { required: true, optional: false },
        )}
        {textField("mileage", t("inventory.fields.mileage"), {
          type: "number",
          inputMode: "numeric",
          number: true,
          required: true,
        })}
        {selectField(
          "mileageUnit",
          t("inventory.fields.mileageUnit"),
          MILEAGE_UNITS.map((unit) => ({
            value: unit,
            label: t(`inventory.enums.mileageUnit.${unit}`),
            icon: MILEAGE_UNIT_ICONS[unit],
          })),
          { searchable: false, optional: false, required: true },
        )}
      </Section>

      <Section title={t("inventory.sections.specs")}>
        {selectField(
          "bodyType",
          t("inventory.fields.bodyType"),
          bodyTypes.map((type) => ({
            value: type,
            label: BODY_TYPES.includes(type as (typeof BODY_TYPES)[number])
              ? t(`inventory.enums.bodyType.${bodyTypeKey(type)}`)
              : type,
            icon: bodyTypeIcon(type),
          })),
          { placeholder: t("inventory.fields.selectPlaceholder") },
        )}
        {selectField(
          "transmission",
          t("inventory.fields.transmission"),
          TRANSMISSION_TYPES.map((type) => ({
            value: type,
            label: t(`inventory.enums.transmission.${type}`),
            icon: TRANSMISSION_ICONS[type],
          })),
          { nullable: true, searchable: false, placeholder: t("inventory.fields.selectPlaceholder") },
        )}
        {selectField(
          "fuelType",
          t("inventory.fields.fuelType"),
          FUEL_TYPES.map((type) => ({
            value: type,
            label: t(`inventory.enums.fuel.${type}`),
            icon: FUEL_ICONS[type],
          })),
          { nullable: true, searchable: false, placeholder: t("inventory.fields.selectPlaceholder") },
        )}
        {textField("engineSize", t("inventory.fields.engineSize"))}
        {textField("engineCylinders", t("inventory.fields.engineCylinders"), {
          type: "number",
          inputMode: "numeric",
          number: true,
        })}
        {selectField(
          "driveType",
          t("inventory.fields.driveType"),
          DRIVE_TYPES.map((type) => ({
            value: type,
            label: t(`inventory.enums.drive.${type}`),
            icon: DRIVE_ICONS[type],
          })),
          { nullable: true, searchable: false, placeholder: t("inventory.fields.selectPlaceholder") },
        )}
        {textField("seats", t("inventory.fields.seats"), {
          type: "number",
          inputMode: "numeric",
          number: true,
        })}
        {textField("doors", t("inventory.fields.doors"), {
          type: "number",
          inputMode: "numeric",
          number: true,
        })}
      </Section>

      <Section title={t("inventory.sections.appearance")}>
        <FormField
          label={t("inventory.fields.exteriorColor")}
          htmlFor="exteriorColor"
          error={message("exteriorColor")}
        >
          <Controller
            control={form.control}
            name="exteriorColor"
            render={({ field }) => (
              <VehicleColorField
                id="exteriorColor"
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("inventory.fields.selectPlaceholder")}
                aria-invalid={errors.exteriorColor ? true : undefined}
                aria-describedby={errors.exteriorColor ? "exteriorColor-error" : undefined}
              />
            )}
          />
        </FormField>
        <FormField
          label={t("inventory.fields.interiorColor")}
          htmlFor="interiorColor"
          error={message("interiorColor")}
        >
          <Controller
            control={form.control}
            name="interiorColor"
            render={({ field }) => (
              <VehicleColorField
                id="interiorColor"
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("inventory.fields.selectPlaceholder")}
                aria-invalid={errors.interiorColor ? true : undefined}
                aria-describedby={errors.interiorColor ? "interiorColor-error" : undefined}
              />
            )}
          />
        </FormField>
      </Section>

      <Section title={t("inventory.sections.origin")}>
        {selectField(
          "originType",
          t("inventory.fields.origin"),
          ORIGIN_TYPES.map((type) => ({
            value: type,
            label: t(`inventory.enums.origin.${type}`),
            icon: ORIGIN_ICONS[type],
          })),
          { nullable: true, searchable: false, placeholder: t("inventory.fields.selectPlaceholder") },
        )}
        {selectField(
          "countryOfOrigin",
          t("inventory.fields.countryOfOrigin"),
          countrySelectOptions(vehicle?.countryOfOrigin),
          {
            nullable: true,
            placeholder: t("inventory.fields.selectPlaceholder"),
            groupLabel: (group) => t(`inventory.enums.countryRegion.${group}`),
          },
        )}
        {textField("purchaseDate", t("inventory.fields.purchaseDate"), { type: "date" })}
        {textField("registrationDate", t("inventory.fields.registrationDate"), { type: "date" })}
      </Section>

      <Section title={t("inventory.sections.location")}>
        {selectField(
          "branchId",
          t("inventory.fields.branch"),
          meta.branches.map((branch) => ({
            value: branch.id,
            label: branch.name,
            icon: BRANCH_ICON,
          })),
          {
            placeholder: t("inventory.form.selectBranch"),
            onChange: () => form.setValue("locationId", ""),
            required: true,
            optional: false,
          },
        )}
        {selectField(
          "locationId",
          t("inventory.fields.location"),
          locations.map((location) => ({
            value: location.id,
            label: location.name,
            icon: LOCATION_ICON,
          })),
          { placeholder: t("inventory.form.noLocation") },
        )}
      </Section>

      <Section title={t("inventory.sections.notes")}>
        <div className="sm:col-span-2 lg:col-span-3">
          <FormField
            label={t("inventory.fields.notes")}
            htmlFor="description"
            error={message("description")}
            hint={t("inventory.fields.notesHint")}
          >
            <Textarea
              id="description"
              rows={4}
              className="min-h-24"
              {...aria("description")}
              {...form.register("description")}
            />
          </FormField>
        </div>
      </Section>

      {extraSections}

      {!hideActions ? (
      <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 z-10 -mx-1 border-t px-1 py-3 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground min-h-5 text-xs">
            {mode === "edit" && !isDirty && !submitting
              ? t("inventory.actions.noChangesHint")
              : null}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link
              href={cancelHref}
              className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}
            >
              {t("inventory.actions.cancel")}
            </Link>
            <LoadingButton
              type="submit"
              className="h-11 sm:h-9"
              loading={submitting}
              disabled={mode === "edit" && !isDirty && !allowSubmitWhenClean}
              title={
                mode === "edit" && !isDirty && !allowSubmitWhenClean
                  ? t("inventory.actions.noChangesHint")
                  : undefined
              }
            >
              {submitting
                ? (submittingLabel ?? t("inventory.actions.updating"))
                : mode === "create"
                  ? t("inventory.actions.createSubmit")
                  : t("inventory.actions.updateSubmit")}
            </LoadingButton>
          </div>
        </div>
      </div>
      ) : null}
    </form>
  );
}

export function VehicleForm({ ref, ...props }: VehicleFormProps) {
  const t = useTranslations();
  const meta = useInventoryMeta();

  if (meta.isPending) {
    return (
      <div className="grid gap-6" aria-busy>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (meta.isError) {
    return (
      <div className="grid gap-3">
        <p className="text-muted-foreground text-sm">{t("inventory.form.metaFailed")}</p>
        <ErrorState onRetry={() => void meta.refetch()} />
      </div>
    );
  }

  return <VehicleFormBody {...props} meta={meta.data} formRef={ref} />;
}
