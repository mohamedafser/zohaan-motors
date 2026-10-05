"use client";

import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AcquisitionForm,
  type AcquisitionFormHandle,
} from "@/components/acquisitions/acquisition-form";
import {
  AcquisitionDocumentsManager,
  uploadPendingAcquisitionDocuments,
  useRevokePendingDocuments,
} from "@/components/acquisitions/acquisition-documents-manager";
import { EmptyState } from "@/components/feedback/empty-state";
import { FormStepper, type FormStepperStep } from "@/components/forms/form-stepper";
import { CreateVehicleReview } from "@/components/inventory/create-vehicle-review";
import { VehicleForm, type VehicleFormHandle } from "@/components/inventory/vehicle-form";
import {
  VehicleImageManager,
  uploadPendingVehiclePhotos,
} from "@/components/inventory/vehicle-image-manager";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcquisition, useAcquisitionMutations } from "@/hooks/use-acquisitions";
import { usePermission } from "@/hooks/use-permission";
import { useVehicle, useVehicleMutations } from "@/hooks/use-vehicles";
import { addAcquisitionDocumentRequest } from "@/lib/acquisitions/document-api-client";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { AcquisitionFormValues } from "@/lib/validation/acquisition";
import type { VehicleFormValues } from "@/lib/validation/vehicle";
import { addVehiclePhotoRequest } from "@/lib/vehicles/photo-api-client";
import type { PendingAcquisitionDocument } from "@/types/acquisition-document";
import type { PendingVehiclePhoto } from "@/types/vehicle-photo";

type MutationError = Error & {
  fieldErrors?: Record<string, string>;
  code?: string;
  existingVehicleId?: string;
  existingAcquisitionId?: string;
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
    const duplicate = err.code === "duplicate_vin" || err.code === "duplicate_chassis";
    const message =
      err.code === "duplicate_vin"
        ? t("inventory.toasts.duplicateVin")
        : err.code === "duplicate_chassis"
          ? t("inventory.toasts.duplicateChassis")
          : err.code === "duplicate_acquisition"
            ? t("acquisitions.errors.duplicateActive")
            : err.message || t("inventory.toasts.error");

    setFieldErrors(err.fieldErrors ? { ...err.fieldErrors } : undefined);
    setFormError(
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{message}</span>
        {duplicate && err.existingVehicleId ? (
          <Link
            href={`/inventory/${err.existingVehicleId}`}
            className="font-medium underline underline-offset-4"
          >
            {t("inventory.actions.viewExisting")}
          </Link>
        ) : err.existingAcquisitionId ? (
          <Link
            href={`/inventory?tab=acquisition`}
            className="font-medium underline underline-offset-4"
          >
            {t("acquisitions.actions.viewExisting")}
          </Link>
        ) : null}
      </span>,
    );
    toast.error(message);
  }

  return { fieldErrors, formError, reset, handle };
}

function withVehicleLink(
  values: AcquisitionFormValues,
  vehicleId: string,
  vehicle: VehicleFormValues,
): AcquisitionFormValues {
  return {
    ...values,
    branchId: vehicle.branchId,
    vehicle: {
      vehicleId,
      vin: vehicle.vin ?? null,
      chassisNumber: vehicle.chassisNumber ?? null,
      make: vehicle.make,
      model: vehicle.model,
      variant: vehicle.variant ?? null,
      year: vehicle.year,
      mileage: vehicle.mileage,
      originType: vehicle.originType ?? "unknown",
      countryOfOrigin: vehicle.countryOfOrigin ?? null,
      makeId: vehicle.makeId ?? null,
      modelId: vehicle.modelId ?? null,
    },
  };
}

type CreateStepId = "vehicle" | "acquisition" | "photos" | "review";

function CreateVehicle() {
  const t = useTranslations();
  const router = useRouter();
  const { can } = usePermission();
  const { create } = useVehicleMutations();
  const { create: createAcquisition } = useAcquisitionMutations();
  const errors = useSubmitErrors();
  const vehicleRef = useRef<VehicleFormHandle | null>(null);
  const acquisitionRef = useRef<AcquisitionFormHandle | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingVehiclePhoto[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<PendingAcquisitionDocument[]>([]);
  const [acquisitionDirty, setAcquisitionDirty] = useState(false);
  const [acquisitionSkipped, setAcquisitionSkipped] = useState(false);
  const [vehicleSnapshot, setVehicleSnapshot] = useState<VehicleFormValues | null>(null);
  const [acquisitionSnapshot, setAcquisitionSnapshot] = useState<AcquisitionFormValues | null>(
    null,
  );
  const [stepId, setStepId] = useState<CreateStepId>("vehicle");
  const [createdVehicleId, setCreatedVehicleId] = useState<string | null>(null);
  const [createdAcquisitionId, setCreatedAcquisitionId] = useState<string | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<PendingVehiclePhoto[]>([]);
  const [failedDocuments, setFailedDocuments] = useState<PendingAcquisitionDocument[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const submitLock = useRef(false);
  const stepScrollRef = useRef<HTMLDivElement | null>(null);
  useRevokePendingDocuments(pendingDocuments);

  const showAcquisition = can("acquisition.create");

  useEffect(() => {
    stepScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    document.getElementById("main")?.scrollTo({ top: 0, behavior: "auto" });
  }, [stepId]);

  useEffect(() => {
    if (stepId !== "review") return;
    let cancelled = false;

    void (async () => {
      const vehicle = await vehicleRef.current?.validate();
      if (!cancelled && vehicle) setVehicleSnapshot(vehicle);

      if (
        showAcquisition &&
        !acquisitionSkipped &&
        (acquisitionDirty || pendingDocuments.length > 0)
      ) {
        const acquisition = await acquisitionRef.current?.validate();
        if (!cancelled && acquisition) setAcquisitionSnapshot(acquisition);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stepId, showAcquisition, acquisitionSkipped, acquisitionDirty, pendingDocuments.length]);

  const steps: FormStepperStep[] = [
    {
      id: "vehicle",
      label: t("inventory.stepper.steps.vehicle"),
      description: t("inventory.stepper.hints.vehicle"),
    },
    ...(showAcquisition
      ? [
          {
            id: "acquisition" as const,
            label: t("inventory.stepper.steps.acquisition"),
            description: t("inventory.stepper.hints.acquisition"),
            optional: true,
          },
        ]
      : []),
    {
      id: "photos",
      label: t("inventory.stepper.steps.photos"),
      description: t("inventory.stepper.hints.photos"),
      optional: true,
    },
    {
      id: "review",
      label: t("inventory.stepper.steps.review"),
      description: t("inventory.stepper.hints.review"),
    },
  ];

  const stepIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === stepId),
  );
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= steps.length - 1;

  async function uploadDocuments(
    acquisitionId: string,
    vehicleId: string,
    documents: PendingAcquisitionDocument[],
  ) {
    return uploadPendingAcquisitionDocuments(
      acquisitionId,
      vehicleId,
      documents,
      async (body) => {
        const result = await addAcquisitionDocumentRequest(acquisitionId, body);
        if (result.status === "error") throw new Error(result.message);
        return result.data;
      },
      (localId, progress, status, errorMessage) => {
        setPendingDocuments((current) =>
          current.map((doc) =>
            doc.localId === localId
              ? {
                  ...doc,
                  progress,
                  status,
                  errorMessage: status === "error" ? errorMessage : undefined,
                }
              : doc,
          ),
        );
      },
    );
  }

  async function saveAll(values: VehicleFormValues) {
    if (create.isPending || uploadingMedia || submitLock.current) return;
    submitLock.current = true;
    errors.reset();

    const wantsAcquisition =
      showAcquisition && !acquisitionSkipped && (acquisitionDirty || pendingDocuments.length > 0);

    let acquisitionValues: AcquisitionFormValues | null = null;
    if (wantsAcquisition) {
      acquisitionValues = (await acquisitionRef.current?.validate()) ?? null;
      if (!acquisitionValues) {
        submitLock.current = false;
        setStepId("acquisition");
        toast.error(t("inventory.acquisition.purchasePriceRequired"));
        return;
      }
    }

    try {
      let vehicleId = createdVehicleId;
      let acquisitionId = createdAcquisitionId;

      if (!vehicleId) {
        const vehicle = await create.mutateAsync(values);
        vehicleId = vehicle.id;
        setCreatedVehicleId(vehicleId);
      }

      if (wantsAcquisition && acquisitionValues && !acquisitionId) {
        const acquisition = await createAcquisition.mutateAsync(
          withVehicleLink(acquisitionValues, vehicleId, values),
        );
        acquisitionId = acquisition.id;
        setCreatedAcquisitionId(acquisitionId);
      }

      const needsMedia =
        pendingPhotos.length > 0 || (acquisitionId != null && pendingDocuments.length > 0);

      if (needsMedia) {
        setUploadingMedia(true);
        try {
          let docsFailed: PendingAcquisitionDocument[] = [];
          if (acquisitionId && pendingDocuments.length > 0) {
            docsFailed = await uploadDocuments(acquisitionId, vehicleId, pendingDocuments);
            setFailedDocuments(docsFailed);
            if (docsFailed.length === 0) setPendingDocuments([]);
            else setPendingDocuments(docsFailed);
          }

          let photosFailed: PendingVehiclePhoto[] = [];
          if (pendingPhotos.length > 0) {
            photosFailed = await uploadPendingVehiclePhotos(
              vehicleId,
              pendingPhotos,
              async (body) => {
                const result = await addVehiclePhotoRequest(vehicleId, body);
                if (result.status === "error") throw new Error(result.message);
                return result.data;
              },
            );
            setFailedPhotos(photosFailed);
            if (photosFailed.length === 0) setPendingPhotos([]);
            else setPendingPhotos(photosFailed);
          }

          if (docsFailed.length > 0 || photosFailed.length > 0) {
            toast.error(t("inventory.acquisition.partialUpload"));
            return;
          }
        } finally {
          setUploadingMedia(false);
        }
      }

      toast.success(t("inventory.toasts.created"));
      router.push(`/inventory/${vehicleId}`);
    } catch (error) {
      errors.handle(error);
    } finally {
      submitLock.current = false;
    }
  }

  async function retryFailedUploads() {
    if (!createdVehicleId) return;
    setUploadingMedia(true);
    try {
      if (createdAcquisitionId && failedDocuments.length > 0) {
        const failed = await uploadDocuments(
          createdAcquisitionId,
          createdVehicleId,
          failedDocuments,
        );
        setFailedDocuments(failed);
        setPendingDocuments(failed);
        if (failed.length > 0) {
          toast.error(t("acquisitions.documents.toasts.partialUpload"));
          return;
        }
      }

      if (failedPhotos.length > 0) {
        const failed = await uploadPendingVehiclePhotos(
          createdVehicleId,
          failedPhotos,
          async (body) => {
            const result = await addVehiclePhotoRequest(createdVehicleId, body);
            if (result.status === "error") throw new Error(result.message);
            return result.data;
          },
        );
        setFailedPhotos(failed);
        setPendingPhotos(failed);
        if (failed.length > 0) {
          toast.error(t("inventory.photos.retryFailed"));
          return;
        }
      }

      toast.success(t("inventory.acquisition.retrySuccess"));
      router.push(`/inventory/${createdVehicleId}`);
    } finally {
      setUploadingMedia(false);
    }
  }

  async function goNext() {
    if (stepId === "vehicle") {
      const values = await vehicleRef.current?.validate();
      if (!values) {
        toast.error(t("inventory.stepper.fixVehicle"));
        return;
      }
      setVehicleSnapshot(values);
      setStepId(showAcquisition ? "acquisition" : "photos");
      return;
    }

    if (stepId === "acquisition") {
      if (acquisitionDirty || pendingDocuments.length > 0) {
        const values = await acquisitionRef.current?.validate();
        if (!values) {
          toast.error(t("inventory.acquisition.purchasePriceRequired"));
          return;
        }
        setAcquisitionSnapshot(values);
        setAcquisitionSkipped(false);
      } else {
        setAcquisitionSnapshot(null);
      }
      setStepId("photos");
      return;
    }

    if (stepId === "photos") {
      setStepId("review");
    }
  }

  function skipAcquisition() {
    setAcquisitionSkipped(true);
    setAcquisitionDirty(false);
    setPendingDocuments([]);
    setAcquisitionSnapshot(null);
    setStepId("photos");
  }

  function goBack() {
    if (isFirst) {
      router.push("/inventory");
      return;
    }
    const prev = steps[stepIndex - 1];
    if (prev) setStepId(prev.id as CreateStepId);
  }

  async function finish() {
    const values = (await vehicleRef.current?.validate()) ?? vehicleSnapshot;
    if (!values) {
      setStepId("vehicle");
      toast.error(t("inventory.stepper.fixVehicle"));
      return;
    }
    await saveAll(values);
  }

  const busy = create.isPending || createAcquisition.isPending || uploadingMedia;
  const hasFailedMedia = failedPhotos.length > 0 || failedDocuments.length > 0;
  const acquisitionIncluded =
    showAcquisition && !acquisitionSkipped && (acquisitionDirty || pendingDocuments.length > 0);

  const reviewVehicle = vehicleSnapshot;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <PageHeader
          title={t("modules.inventoryNew.title")}
          description={t("modules.inventoryNew.description")}
        />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-0 !p-0">
          <div
            ref={stepScrollRef}
            className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
          >
            <FormStepper
              steps={steps}
              currentId={stepId}
              onStepSelect={(id) => setStepId(id as CreateStepId)}
            />

            {uploadingMedia ? (
              <div
                className="bg-muted/40 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
                role="status"
                aria-live="polite"
              >
                <Loader2Icon className="text-primary size-5 shrink-0 animate-spin" aria-hidden />
                <p className="font-medium">{t("inventory.acquisition.uploadingMedia")}</p>
              </div>
            ) : null}
            {createdVehicleId && hasFailedMedia && !uploadingMedia ? (
              <div className="border-destructive/40 bg-destructive/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
                <p>{t("inventory.acquisition.partialUpload")}</p>
                <Button type="button" onClick={() => void retryFailedUploads()} disabled={busy}>
                  {t("inventory.photos.retryUpload")}
                </Button>
              </div>
            ) : null}

            {errors.formError ? (
              <div className="border-destructive/40 bg-destructive/5 rounded-xl border px-4 py-3 text-sm">
                {errors.formError}
              </div>
            ) : null}

            <div className={cn(stepId === "vehicle" ? "block" : "hidden")}>
              <VehicleForm
                ref={vehicleRef}
                mode="create"
                submitting={busy}
                fieldErrors={errors.fieldErrors}
                formError={null}
                cancelHref="/inventory"
                hideActions
                onSubmit={async () => undefined}
              />
            </div>

            {showAcquisition ? (
              <div className={cn(stepId === "acquisition" ? "block" : "hidden")}>
                <AcquisitionForm
                  ref={acquisitionRef}
                  embedded
                  mode="create"
                  submitting={busy}
                  fieldErrors={errors.fieldErrors}
                  formError={null}
                  onDirtyChange={(dirty) => {
                    setAcquisitionDirty(dirty);
                    if (dirty) setAcquisitionSkipped(false);
                  }}
                  extraSections={
                    can("document.create") || can("document.view") ? (
                      createdAcquisitionId && createdVehicleId ? (
                        <AcquisitionDocumentsManager
                          mode="manage"
                          acquisitionId={createdAcquisitionId}
                          vehicleId={createdVehicleId}
                          readOnly={busy || !can("document.create")}
                        />
                      ) : can("document.create") ? (
                        <AcquisitionDocumentsManager
                          mode="draft"
                          documents={pendingDocuments}
                          onChange={(docs) => {
                            setPendingDocuments(docs);
                            if (docs.length > 0) setAcquisitionSkipped(false);
                          }}
                          disabled={busy}
                        />
                      ) : null
                    ) : null
                  }
                />
              </div>
            ) : null}

            <div className={cn(stepId === "photos" ? "block" : "hidden")}>
              <VehicleImageManager
                mode="draft"
                photos={pendingPhotos}
                onChange={setPendingPhotos}
                disabled={busy}
              />
            </div>

            {stepId === "review" ? (
              <CreateVehicleReview
                vehicle={reviewVehicle}
                acquisition={acquisitionSnapshot}
                acquisitionIncluded={acquisitionIncluded}
                documents={pendingDocuments}
                photos={pendingPhotos}
                showAcquisition={showAcquisition}
                onEditVehicle={() => setStepId("vehicle")}
                onEditAcquisition={() => setStepId("acquisition")}
                onEditPhotos={() => setStepId("photos")}
              />
            ) : null}
          </div>

          <div className="bg-background shrink-0 border-t px-4 py-2.5 sm:px-6">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-24"
                onClick={goBack}
                disabled={busy}
              >
                <ChevronLeftIcon aria-hidden className="rtl:rotate-180" />
                {t("inventory.stepper.back")}
              </Button>
              {stepId === "acquisition" || stepId === "photos" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-w-24"
                  onClick={stepId === "acquisition" ? skipAcquisition : () => setStepId("review")}
                  disabled={busy}
                >
                  {t("inventory.stepper.skip")}
                  <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
                </Button>
              ) : null}
              {isLast ? (
                <LoadingButton
                  type="button"
                  size="sm"
                  className="min-w-28"
                  loading={busy}
                  onClick={() => void finish()}
                >
                  {uploadingMedia ? (
                    t("inventory.acquisition.uploadingMedia")
                  ) : (
                    <>
                      {t("inventory.actions.createSubmit")}
                      <CheckIcon aria-hidden />
                    </>
                  )}
                </LoadingButton>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="min-w-24"
                  onClick={() => void goNext()}
                  disabled={busy}
                >
                  {t("inventory.stepper.continue")}
                  <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditVehicle({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { can } = usePermission();
  const query = useVehicle(vehicleId);
  const { update } = useVehicleMutations(vehicleId);
  const errors = useSubmitErrors();
  const acquisitionRef = useRef<AcquisitionFormHandle | null>(null);
  const [acquisitionDirty, setAcquisitionDirty] = useState(false);
  const [savingAcquisition, setSavingAcquisition] = useState(false);
  const [localAcquisitionId, setLocalAcquisitionId] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingAcquisitionDocument[]>([]);
  useRevokePendingDocuments(pendingDocuments);

  const linkedAcquisitionId = query.data?.acquisition?.id ?? null;
  const resolvedAcquisitionId = localAcquisitionId ?? linkedAcquisitionId;
  const acquisitionQuery = useAcquisition(resolvedAcquisitionId ?? "");
  const { create: createAcquisition, update: updateAcquisition } = useAcquisitionMutations(
    resolvedAcquisitionId ?? undefined,
  );

  const canManageAcquisition = can("acquisition.create") || can("acquisition.edit");
  const showAcquisition = canManageAcquisition || Boolean(linkedAcquisitionId);

  async function onSubmit(values: VehicleFormValues) {
    errors.reset();

    const wantsAcquisition =
      canManageAcquisition && (acquisitionDirty || pendingDocuments.length > 0);

    let acquisitionValues: AcquisitionFormValues | null = null;
    if (wantsAcquisition) {
      acquisitionValues = (await acquisitionRef.current?.validate()) ?? null;
      if (!acquisitionValues) {
        toast.error(t("inventory.acquisition.purchasePriceRequired"));
        return;
      }
    }

    try {
      await update.mutateAsync(values);

      if (wantsAcquisition && acquisitionValues) {
        setSavingAcquisition(true);
        try {
          if (resolvedAcquisitionId && can("acquisition.edit")) {
            await updateAcquisition.mutateAsync(acquisitionValues);
          } else if (can("acquisition.create")) {
            const created = await createAcquisition.mutateAsync(
              withVehicleLink(acquisitionValues, vehicleId, values),
            );
            setLocalAcquisitionId(created.id);

            if (pendingDocuments.length > 0) {
              const failed = await uploadPendingAcquisitionDocuments(
                created.id,
                vehicleId,
                pendingDocuments,
                async (body) => {
                  const result = await addAcquisitionDocumentRequest(created.id, body);
                  if (result.status === "error") throw new Error(result.message);
                  return result.data;
                },
              );
              if (failed.length > 0) {
                setPendingDocuments(failed);
                toast.error(t("acquisitions.documents.toasts.partialUpload"));
                return;
              }
              setPendingDocuments([]);
            }
          }
        } finally {
          setSavingAcquisition(false);
        }
      }

      toast.success(t("inventory.toasts.updated"));
      router.push(`/inventory/${vehicleId}`);
    } catch (error) {
      errors.handle(error);
    }
  }

  if (query.isPending || (linkedAcquisitionId && acquisitionQuery.isPending)) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        title={t("inventory.empty.notFound")}
        description={t("inventory.empty.notFoundHint")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => void query.refetch()}>
              {t("common.retry")}
            </Button>
            <Link href="/inventory" className={cn(buttonVariants())}>
              {t("inventory.actions.back")}
            </Link>
          </div>
        }
      />
    );
  }

  const busy = update.isPending || savingAcquisition;
  const acquisitionMode = resolvedAcquisitionId && acquisitionQuery.data ? "edit" : "create";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("inventory.editTitle")} description={query.data.stockNumber} />
      <VehicleForm
        mode="edit"
        vehicle={query.data}
        submitting={busy}
        submittingLabel={
          savingAcquisition ? t("inventory.acquisition.savingAcquisition") : undefined
        }
        fieldErrors={errors.fieldErrors}
        formError={errors.formError}
        cancelHref={`/inventory/${vehicleId}`}
        onSubmit={onSubmit}
        allowSubmitWhenClean={acquisitionDirty || pendingDocuments.length > 0}
        extraSections={
          <>
            {showAcquisition ? (
              acquisitionMode === "edit" && acquisitionQuery.data ? (
                <AcquisitionForm
                  key={acquisitionQuery.data.id}
                  ref={acquisitionRef}
                  embedded
                  mode="edit"
                  acquisition={acquisitionQuery.data}
                  branchId={query.data.branchId}
                  submitting={busy}
                  fieldErrors={errors.fieldErrors}
                  formError={null}
                  onDirtyChange={setAcquisitionDirty}
                  extraSections={
                    can("document.view") || can("document.create") ? (
                      <AcquisitionDocumentsManager
                        mode="manage"
                        acquisitionId={acquisitionQuery.data.id}
                        vehicleId={vehicleId}
                        readOnly={busy || !can("document.create")}
                      />
                    ) : null
                  }
                />
              ) : can("acquisition.create") ? (
                <AcquisitionForm
                  ref={acquisitionRef}
                  embedded
                  mode="create"
                  branchId={query.data.branchId}
                  submitting={busy}
                  fieldErrors={errors.fieldErrors}
                  formError={null}
                  onDirtyChange={setAcquisitionDirty}
                  extraSections={
                    can("document.create") ? (
                      <AcquisitionDocumentsManager
                        mode="draft"
                        documents={pendingDocuments}
                        onChange={setPendingDocuments}
                        disabled={busy}
                      />
                    ) : null
                  }
                />
              ) : null
            ) : null}
            <VehicleImageManager mode="manage" vehicleId={vehicleId} />
          </>
        }
      />
    </div>
  );
}

export function VehicleFormPage({
  mode,
  vehicleId,
}: {
  mode: "create" | "edit";
  vehicleId?: string;
}) {
  if (mode === "create") return <CreateVehicle />;
  return <EditVehicle key={vehicleId} vehicleId={vehicleId!} />;
}
