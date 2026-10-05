"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
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
import { useVehicleMutations } from "@/hooks/use-vehicles";
import { vehicleTitle } from "@/components/inventory/inventory-utils";
import {
  markReadyForSaleSchema,
  type MarkReadyForSaleValues,
} from "@/lib/validation/vehicle";
import type { ReadyForSaleEligibility } from "@/types/ready-for-sale";
import type { VehicleDetail } from "@/types/vehicle";

function ReadyForSaleForm({
  vehicle,
  eligibility,
  onDone,
}: {
  vehicle: VehicleDetail;
  eligibility: ReadyForSaleEligibility;
  onDone: () => void;
}) {
  const t = useTranslations();
  const { markReadyForSale } = useVehicleMutations(vehicle.id);
  const needsOverride = !eligibility.eligible && eligibility.canOverride;

  const form = useForm<MarkReadyForSaleValues>({
    resolver: zodResolver(markReadyForSaleSchema) as never,
    defaultValues: {
      reason: "",
      override: needsOverride,
      overrideReason: "",
    },
  });

  useEffect(() => {
    form.reset({
      reason: "",
      override: needsOverride,
      overrideReason: "",
    });
  }, [form, needsOverride, eligibility.eligible]);

  const { errors } = form.formState;
  const override = useWatch({ control: form.control, name: "override" });

  async function submit(values: MarkReadyForSaleValues) {
    try {
      await markReadyForSale.mutateAsync({
        reason: values.reason?.trim() ? values.reason.trim() : null,
        override: needsOverride ? true : Boolean(values.override),
        overrideReason: values.overrideReason?.trim() ? values.overrideReason.trim() : null,
      });
      toast.success(t("inventory.toasts.readyForSale"));
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inventory.toasts.error"));
    }
  }

  if (!eligibility.eligible && !eligibility.canOverride) {
    return (
      <>
        <Alert variant="destructive">
          <AlertTitle>{t("inventory.readyForSale.blockedTitle")}</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 grid gap-1">
              {eligibility.blockers.map((blocker, index) => (
                <li key={`${blocker.code}-${index}`}>• {blocker.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            {t("inventory.actions.cancel")}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(submit)}>
      <dl className="grid gap-3 rounded-lg border border-border/70 p-3 text-sm">
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground text-xs">{t("inventory.readyForSale.confirm.vehicle")}</dt>
          <dd className="font-medium">{vehicleTitle(vehicle)}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground text-xs">{t("inventory.fields.stockId")}</dt>
          <dd className="font-mono">{vehicle.stockNumber}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground text-xs">{t("inventory.readyForSale.confirm.inspection")}</dt>
          <dd>{t(`inventory.readyForSale.summary.inspection.${eligibility.summary.inspection}`)}</dd>
        </div>
      </dl>

      <p className="text-muted-foreground text-sm">{t("inventory.readyForSale.confirm.hint")}</p>

      {needsOverride ? (
        <Alert>
          <AlertTitle>{t("inventory.readyForSale.overrideTitle")}</AlertTitle>
          <AlertDescription>{t("inventory.readyForSale.overrideHint")}</AlertDescription>
        </Alert>
      ) : null}

      {!needsOverride && eligibility.canOverride ? (
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={Boolean(override)}
            onCheckedChange={(checked) => form.setValue("override", checked === true)}
          />
          <span>{t("inventory.readyForSale.overrideToggle")}</span>
        </label>
      ) : null}

      {(needsOverride || override) ? (
        <FormField
          label={t("inventory.readyForSale.overrideReason")}
          htmlFor="ready-override-reason"
          error={errors.overrideReason?.message}
        >
          <Textarea
            id="ready-override-reason"
            rows={3}
            maxLength={500}
            placeholder={t("inventory.readyForSale.overrideReasonPlaceholder")}
            aria-invalid={errors.overrideReason ? true : undefined}
            {...form.register("overrideReason")}
          />
        </FormField>
      ) : null}

      <FormField
        label={t("inventory.readyForSale.reasonOptional")}
        htmlFor="ready-reason"
        error={errors.reason?.message}
      >
        <Textarea
          id="ready-reason"
          rows={2}
          maxLength={500}
          placeholder={t("inventory.readyForSale.reasonPlaceholder")}
          aria-invalid={errors.reason ? true : undefined}
          {...form.register("reason")}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("inventory.actions.cancel")}
        </Button>
        <LoadingButton type="submit" loading={markReadyForSale.isPending}>
          {t("inventory.actions.markReadyForSale")}
        </LoadingButton>
      </DialogFooter>
    </form>
  );
}

export function VehicleReadyForSaleDialog({
  vehicle,
  eligibility,
  open,
  onOpenChange,
}: {
  vehicle: VehicleDetail;
  eligibility: ReadyForSaleEligibility;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("inventory.dialogs.readyForSale.title")}</DialogTitle>
          <DialogDescription>
            {t("inventory.dialogs.readyForSale.description", { stock: vehicle.stockNumber })}
          </DialogDescription>
        </DialogHeader>
        <ReadyForSaleForm
          vehicle={vehicle}
          eligibility={eligibility}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
