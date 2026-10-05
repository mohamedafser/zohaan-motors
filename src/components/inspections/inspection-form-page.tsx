"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { InspectionForm } from "@/components/inspections/inspection-form";
import { PageHeader } from "@/components/layout/page-header";
import { useInspectionMutations } from "@/hooks/use-inspections";
import { useRouter } from "@/lib/i18n/navigation";
import type { CreateInspectionValues } from "@/lib/validation/inspection";

type MutationError = Error & {
  fieldErrors?: Record<string, string>;
  code?: string;
};

function useSubmitErrors() {
  const t = useTranslations();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | undefined>();
  const [formError, setFormError] = useState<ReactNode>(null);

  function reset() {
    setFieldErrors(undefined);
    setFormError(null);
  }

  function handle(error: unknown) {
    const err = error as MutationError;
    const message = err.message || t("inspections.toasts.error");
    setFieldErrors(err.fieldErrors ? { ...err.fieldErrors } : undefined);
    setFormError(message);
    toast.error(message);
  }

  return { fieldErrors, formError, reset, handle };
}

export function InspectionFormPage({
  defaultVehicleId,
}: {
  defaultVehicleId?: string;
} = {}) {
  const t = useTranslations();
  const router = useRouter();
  const { create } = useInspectionMutations();
  const errors = useSubmitErrors();

  async function onSubmit(values: CreateInspectionValues) {
    errors.reset();
    try {
      const inspection = await create.mutateAsync(values);
      toast.success(
        t("inspections.toasts.created", { number: inspection.inspectionNumber }),
      );
      router.push(`/inspections/${inspection.id}/edit`);
    } catch (error) {
      errors.handle(error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("modules.inspectionsNew.title")}
        description={t("modules.inspectionsNew.description")}
      />
      <InspectionForm
        submitting={create.isPending}
        fieldErrors={errors.fieldErrors}
        formError={errors.formError}
        cancelHref="/inspections"
        defaultVehicleId={defaultVehicleId}
        onSubmit={onSubmit}
      />
    </div>
  );
}
