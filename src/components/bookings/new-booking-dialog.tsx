"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PhoneInput } from "@/components/forms/phone-input";
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
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import type { BookableVehicle, CustomerOption, PersonOption } from "@/lib/bookings/service";
import { firstFieldErrors } from "@/lib/validation";
import { createBookingSchema } from "@/lib/validation/booking";

function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const emptyForm = () => ({
  vehicleId: "",
  customerMode: "existing" as "existing" | "new",
  customerId: "",
  salespersonId: "",
  firstName: "",
  lastName: "",
  phone: "",
  deposit: "",
  expiresOn: inDays(7),
  notes: "",
});

export function NewBookingDialog({
  open,
  onOpenChange,
  initialVehicleId,
  canCreateCustomer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVehicleId?: string;
  canCreateCustomer: boolean;
  onCreated: () => void;
}) {
  const t = useTranslations("bookings");
  const tRoot = useTranslations();
  const msg = (key: string) => tRoot(key as Parameters<typeof tRoot>[0]);

  const [form, setForm] = useState(() => ({ ...emptyForm(), vehicleId: initialVehicleId ?? "" }));
  const [vehicles, setVehicles] = useState<BookableVehicle[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [salesExecutives, setSalesExecutives] = useState<PersonOption[]>([]);
  const [selfSalespersonId, setSelfSalespersonId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/bookings/options", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== "success") return;
        setVehicles(json.data.vehicles);
        setCustomers(json.data.customers);
        setSalesExecutives(json.data.salesExecutives);
        setSelfSalespersonId(json.data.selfSalespersonId);
        if (json.data.customers.length === 0) {
          setForm((prev) => ({ ...prev, customerMode: canCreateCustomer ? "new" : "existing" }));
        }
      });
  }, [open, canCreateCustomer]);

  type FormValues = ReturnType<typeof emptyForm>;

  // Who the booking belongs to: an existing customer's own sales executive,
  // otherwise the signed-in sales executive, otherwise whoever is picked.
  function lockedSalesperson(values: FormValues): PersonOption | null {
    if (values.customerMode === "existing") {
      const owner = customers.find((c) => c.id === values.customerId)?.salesperson;
      if (owner) return owner;
    }
    if (selfSalespersonId) {
      return salesExecutives.find((p) => p.id === selfSalespersonId) ?? { id: selfSalespersonId, name: "" };
    }
    return null;
  }

  function duplicateCustomer(values: FormValues) {
    if (values.customerMode !== "new" || !values.phone) return null;
    return customers.find((c) => c.phone === values.phone) ?? null;
  }

  function toPayload(values: FormValues) {
    return {
      ...values,
      deposit: values.deposit === "" ? Number.NaN : Number(values.deposit),
      customerId: values.customerMode === "existing" ? values.customerId : undefined,
      salespersonId: lockedSalesperson(values)?.id ?? (values.salespersonId || undefined),
    };
  }

  function validate(values: ReturnType<typeof emptyForm>) {
    const parsed = createBookingSchema.safeParse(toPayload(values));
    const errors: Record<string, string> = parsed.success ? {} : firstFieldErrors(parsed.error);
    if (duplicateCustomer(values)) errors.phone = "bookings.errors.customerExists";
    const customerChosen = values.customerMode === "new" || !!values.customerId;
    if (customerChosen && !lockedSalesperson(values) && !values.salespersonId) {
      errors.salespersonId = "bookings.errors.salespersonRequired";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    update({ [key]: value } as Partial<FormValues>);
  }

  function update(patch: Partial<FormValues>) {
    const next = { ...form, ...patch };
    setForm(next);
    if (submitted) {
      validate(next);
    } else if (patch.phone !== undefined) {
      // Duplicate phone numbers are flagged as soon as they're typed.
      setFieldErrors((prev) => {
        const rest = { ...prev };
        delete rest.phone;
        return duplicateCustomer(next) ? { ...rest, phone: "bookings.errors.customerExists" } : rest;
      });
    }
  }

  function selectDuplicate(customerId: string) {
    update({ customerMode: "existing", customerId, phone: "", firstName: "", lastName: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (!validate(form)) return;

    setSaving(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(toPayload(form)),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!json || json.status !== "success") {
      if (json?.fieldErrors && Object.keys(json.fieldErrors).length > 0) {
        setFieldErrors(json.fieldErrors);
      } else {
        setFormError(json?.message ?? t("errors.createFailed"));
      }
      return;
    }

    toast.success(t("created"));
    onOpenChange(false);
    onCreated();
  }

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: v.stockNumber ? `${v.stockNumber} · ${v.title}` : v.title,
      })),
    [vehicles],
  );
  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.phone}` })),
    [customers],
  );

  const error = (key: string) =>
    fieldErrors[key] ? <p className="text-destructive text-xs">{msg(fieldErrors[key])}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("newTitle")}</DialogTitle>
            <DialogDescription>{t("newDescription")}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex max-h-[65svh] flex-col gap-4 overflow-y-auto px-0.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-vehicle">{t("vehicle")}</Label>
              <SearchableSelect
                id="booking-vehicle"
                value={form.vehicleId}
                onValueChange={(v) => set("vehicleId", v)}
                options={vehicleOptions}
                optional={false}
                placeholder={vehicles.length ? t("selectVehicle") : t("noVehicles")}
              />
              {error("vehicleId")}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("customer")}</Label>
              {canCreateCustomer ? (
                <div className="bg-muted inline-flex w-fit rounded-lg p-0.5 text-sm" role="radiogroup">
                  {(["existing", "new"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={form.customerMode === mode}
                      onClick={() => set("customerMode", mode)}
                      className={
                        form.customerMode === mode
                          ? "bg-background rounded-md px-3 py-1 font-medium shadow-xs"
                          : "text-muted-foreground px-3 py-1"
                      }
                    >
                      {t(mode === "existing" ? "existingCustomer" : "newCustomer")}
                    </button>
                  ))}
                </div>
              ) : null}

              {form.customerMode === "existing" ? (
                <>
                  <SearchableSelect
                    id="booking-customer"
                    value={form.customerId}
                    onValueChange={(v) => set("customerId", v)}
                    options={customerOptions}
                    optional={false}
                    placeholder={customers.length ? t("selectCustomer") : t("noCustomers")}
                  />
                  {error("customerId")}
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="booking-first">{t("firstName")}</Label>
                    <Input
                      id="booking-first"
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      aria-invalid={!!fieldErrors.firstName || undefined}
                    />
                    {error("firstName")}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="booking-last">{t("lastName")}</Label>
                    <Input
                      id="booking-last"
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      aria-invalid={!!fieldErrors.lastName || undefined}
                    />
                    {error("lastName")}
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="booking-phone">{t("phone")}</Label>
                    <PhoneInput
                      id="booking-phone"
                      value={form.phone}
                      onChange={(v) => set("phone", v)}
                      invalid={!!fieldErrors.phone}
                    />
                    {error("phone")}
                    {duplicateCustomer(form) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-fit"
                        onClick={() => selectDuplicate(duplicateCustomer(form)!.id)}
                      >
                        {t("useExisting", { name: duplicateCustomer(form)!.name })}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-salesperson">{t("salesperson")}</Label>
              {lockedSalesperson(form) ? (
                <>
                  <Input id="booking-salesperson" value={lockedSalesperson(form)!.name} readOnly disabled />
                  <p className="text-muted-foreground text-xs">
                    {form.customerMode === "existing" &&
                    customers.find((c) => c.id === form.customerId)?.salesperson
                      ? t("salespersonLinked")
                      : t("salespersonSelf")}
                  </p>
                </>
              ) : (
                <SearchableSelect
                  id="booking-salesperson"
                  value={form.salespersonId}
                  onValueChange={(v) => set("salespersonId", v)}
                  options={salesExecutives.map((p) => ({ value: p.id, label: p.name }))}
                  optional={false}
                  placeholder={salesExecutives.length ? t("selectSalesperson") : t("noSalespeople")}
                />
              )}
              {error("salespersonId")}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-deposit">{t("deposit")}</Label>
                <Input
                  id="booking-deposit"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.deposit}
                  onChange={(e) => set("deposit", e.target.value)}
                  aria-invalid={!!fieldErrors.deposit || undefined}
                />
                {error("deposit")}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="booking-expires">{t("expiresOn")}</Label>
                <Input
                  id="booking-expires"
                  type="date"
                  min={inDays(0)}
                  value={form.expiresOn}
                  onChange={(e) => set("expiresOn", e.target.value)}
                  aria-invalid={!!fieldErrors.expiresOn || undefined}
                />
                {error("expiresOn")}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="booking-notes">{t("notes")}</Label>
              <Textarea
                id="booking-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            {formError ? <p className="text-destructive text-sm">{formError}</p> : null}
          </div>

          <DialogFooter className="mt-6" showCloseButton>
            <Button type="submit" disabled={saving}>
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
