"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { STATUS_ICONS } from "@/components/inventory/vehicle-select-icons";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useVehicleMutations } from "@/hooks/use-vehicles";
import {
  changeVehicleStatusSchema,
  type ChangeVehicleStatusValues,
} from "@/lib/validation/vehicle";
import { getGenericStatusChangeOptions } from "@/lib/vehicles/status-transitions";
import type { VehicleStatus } from "@/types/vehicle";

type DialogVehicle = { id: string; status: VehicleStatus };

function StatusForm({ vehicle, onDone }: { vehicle: DialogVehicle; onDone: () => void }) {
  const t = useTranslations();
  const { changeStatus } = useVehicleMutations(vehicle.id);
  // Archiving has its own dialog. Ready for Sale uses the dedicated eligibility flow.
  const options = getGenericStatusChangeOptions(vehicle.status);

  const form = useForm<ChangeVehicleStatusValues>({
    resolver: zodResolver(changeVehicleStatusSchema),
    defaultValues: { status: options[0], reason: "" },
  });
  const { errors } = form.formState;

  async function submit(values: ChangeVehicleStatusValues) {
    try {
      await changeStatus.mutateAsync(values);
      toast.success(t("inventory.toasts.statusChanged"));
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inventory.toasts.error"));
    }
  }

  if (options.length === 0) {
    return (
      <>
        <Alert>
          <AlertDescription>{t("inventory.dialogs.status.noTransitions")}</AlertDescription>
        </Alert>
        <DialogFooter showCloseButton />
      </>
    );
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(submit)}>
      <FormField
        label={t("inventory.dialogs.status.newStatus")}
        htmlFor="status-next"
        error={errors.status?.message}
      >
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <SearchableSelect
              id="status-next"
              value={field.value}
              onValueChange={field.onChange}
              searchable={false}
              options={options.map((status) => ({
                value: status,
                label: t(`inventory.status.${status}`),
                icon: STATUS_ICONS[status],
              }))}
              aria-invalid={errors.status ? true : undefined}
            />
          )}
        />
      </FormField>
      <FormField
        label={t("inventory.dialogs.status.reason")}
        htmlFor="status-reason"
        error={errors.reason?.message}
      >
        <Textarea
          id="status-reason"
          rows={3}
          maxLength={500}
          placeholder={t("inventory.dialogs.status.reasonPlaceholder")}
          aria-invalid={errors.reason ? true : undefined}
          {...form.register("reason")}
        />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("inventory.actions.cancel")}
        </Button>
        <LoadingButton type="submit" loading={changeStatus.isPending}>
          {t("inventory.dialogs.status.submit")}
        </LoadingButton>
      </DialogFooter>
    </form>
  );
}

export function VehicleStatusDialog({
  vehicle,
  open,
  onOpenChange,
}: {
  vehicle: DialogVehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inventory.dialogs.status.title")}</DialogTitle>
          <DialogDescription>
            {t("inventory.dialogs.status.description", {
              status: t(`inventory.status.${vehicle.status}`),
            })}
          </DialogDescription>
        </DialogHeader>
        <StatusForm vehicle={vehicle} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
