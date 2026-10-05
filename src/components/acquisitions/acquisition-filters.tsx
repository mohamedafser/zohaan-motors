"use client";

import { ChevronDownIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  countActiveFilters,
  useAcquisitionUrlState,
} from "@/components/acquisitions/acquisition-query";
import {
  ACQUISITION_DOCUMENT_ICONS,
  ACQUISITION_PAYMENT_ICONS,
  ACQUISITION_REGISTRATION_ICONS,
  ACQUISITION_SORT_ICONS,
  ACQUISITION_SOURCE_ICONS,
  ACQUISITION_STATUS_ICONS,
  BRANCH_ICON,
  ORDER_ICONS,
} from "@/components/acquisitions/acquisition-select-icons";
import { FormField } from "@/components/forms/form-field";
import {
  DebouncedFilterInput,
  FilterChip,
  FilterGroup,
  FilterToolbar,
} from "@/components/shared/filter-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAcquisitionMeta } from "@/hooks/use-acquisitions";
import { usePermission } from "@/hooks/use-permission";
import {
  ACQUISITION_DOCUMENT_STATUSES,
  ACQUISITION_PAYMENT_STATUSES,
  ACQUISITION_REGISTRATION_STATUSES,
  ACQUISITION_SORT_FIELDS,
  ACQUISITION_SOURCE_TYPES,
  ACQUISITION_STATUSES,
} from "@/types/acquisition";

const ADVANCED_KEYS = [
  "sourceType",
  "make",
  "model",
  "purchaseDateFrom",
  "purchaseDateTo",
  "createdFrom",
  "createdTo",
  "paymentStatus",
  "documentStatus",
  "registrationStatus",
  "priceMin",
  "priceMax",
] as const;

export function AcquisitionFilters() {
  const t = useTranslations();
  const { searchParams, update, clear } = useAcquisitionUrlState();
  const meta = useAcquisitionMeta();
  const { can } = usePermission();
  const showCost = can("acquisition.cost.view") || can("vehicle.cost.view");
  const [expanded, setExpanded] = useState(false);

  const activeCount = countActiveFilters(searchParams);
  const hasQuery = activeCount > 0 || Boolean(searchParams.get("q"));
  const branchId = searchParams.get("branchId") ?? "";
  const makeValue = searchParams.get("make") ?? "";
  const advancedCount = ADVANCED_KEYS.filter((key) => {
    if ((key === "priceMin" || key === "priceMax") && !showCost) return false;
    return Boolean(searchParams.get(key));
  }).length;
  const showAdvanced = expanded || advancedCount > 0;

  const selectedMake = useMemo(
    () =>
      (meta.data?.makes ?? []).find(
        (make) => make.name.toLowerCase() === makeValue.trim().toLowerCase(),
      ),
    [meta.data?.makes, makeValue],
  );

  const modelOptions = useMemo(() => {
    const models = meta.data?.models ?? [];
    return selectedMake
      ? models.filter((model) => model.makeId === selectedMake.id)
      : models;
  }, [meta.data?.models, selectedMake]);

  const chips = useMemo(() => {
    const items: { key: string; label: string; value: string; clear: Record<string, null> }[] =
      [];

    const q = searchParams.get("q")?.trim();
    if (q) {
      items.push({
        key: "q",
        label: t("acquisitions.filters.searchLabel"),
        value: q,
        clear: { q: null },
      });
    }

    const status = searchParams.get("status");
    if (status) {
      items.push({
        key: "status",
        label: t("acquisitions.filters.status"),
        value: t(`acquisitions.status.${status}`),
        clear: { status: null },
      });
    }

    if (branchId) {
      const branch = meta.data?.branches.find((item) => item.id === branchId);
      items.push({
        key: "branchId",
        label: t("acquisitions.filters.branch"),
        value: branch?.name ?? branchId,
        clear: { branchId: null },
      });
    }

    const sourceType = searchParams.get("sourceType");
    if (sourceType) {
      items.push({
        key: "sourceType",
        label: t("acquisitions.filters.sourceType"),
        value: t(`acquisitions.sourceTypes.${sourceType}`),
        clear: { sourceType: null },
      });
    }

    if (makeValue) {
      items.push({
        key: "make",
        label: t("acquisitions.filters.make"),
        value: makeValue,
        clear: { make: null, model: null },
      });
    }

    const model = searchParams.get("model");
    if (model) {
      items.push({
        key: "model",
        label: t("acquisitions.filters.model"),
        value: model,
        clear: { model: null },
      });
    }

    const paymentStatus = searchParams.get("paymentStatus");
    if (paymentStatus) {
      items.push({
        key: "paymentStatus",
        label: t("acquisitions.filters.paymentStatus"),
        value: t(`acquisitions.enums.paymentStatus.${paymentStatus}`),
        clear: { paymentStatus: null },
      });
    }

    const documentStatus = searchParams.get("documentStatus");
    if (documentStatus) {
      items.push({
        key: "documentStatus",
        label: t("acquisitions.filters.documentStatus"),
        value: t(`acquisitions.enums.documentStatus.${documentStatus}`),
        clear: { documentStatus: null },
      });
    }

    const registrationStatus = searchParams.get("registrationStatus");
    if (registrationStatus) {
      items.push({
        key: "registrationStatus",
        label: t("acquisitions.filters.registrationStatus"),
        value: t(`acquisitions.enums.registrationStatus.${registrationStatus}`),
        clear: { registrationStatus: null },
      });
    }

    const purchaseFrom = searchParams.get("purchaseDateFrom");
    const purchaseTo = searchParams.get("purchaseDateTo");
    if (purchaseFrom || purchaseTo) {
      items.push({
        key: "purchaseDate",
        label: t("acquisitions.filters.purchaseDateFrom"),
        value: [purchaseFrom || "…", purchaseTo || "…"].join(" – "),
        clear: { purchaseDateFrom: null, purchaseDateTo: null },
      });
    }

    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    if (createdFrom || createdTo) {
      items.push({
        key: "createdDate",
        label: t("acquisitions.filters.createdFrom"),
        value: [createdFrom || "…", createdTo || "…"].join(" – "),
        clear: { createdFrom: null, createdTo: null },
      });
    }

    if (showCost) {
      const priceMin = searchParams.get("priceMin");
      const priceMax = searchParams.get("priceMax");
      if (priceMin || priceMax) {
        items.push({
          key: "price",
          label: t("acquisitions.filters.groupPrice"),
          value: [priceMin || "…", priceMax || "…"].join(" – "),
          clear: { priceMin: null, priceMax: null },
        });
      }
    }

    return items;
  }, [branchId, makeValue, meta.data?.branches, searchParams, showCost, t]);

  return (
    <section
      className="bg-card flex flex-col gap-3 rounded-xl border p-3 md:p-4"
      aria-label={t("acquisitions.filters.searchLabel")}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <DebouncedFilterInput
            type="search"
            inputMode="search"
            aria-label={t("acquisitions.filters.searchLabel")}
            placeholder={t("acquisitions.filters.searchPlaceholder")}
            className="h-11 ps-9 md:h-10"
            value={searchParams.get("q") ?? ""}
            onCommit={(value) => update({ q: value })}
          />
        </div>
        <SearchableSelect
          aria-label={t("acquisitions.filters.status")}
          value={searchParams.get("status") ?? ""}
          onValueChange={(value) => update({ status: value })}
          optional
          placeholder={t("acquisitions.filters.allStatuses")}
          options={ACQUISITION_STATUSES.map((status) => ({
            value: status,
            label: t(`acquisitions.status.${status}`),
            icon: ACQUISITION_STATUS_ICONS[status],
          }))}
        />
        <SearchableSelect
          aria-label={t("acquisitions.filters.branch")}
          value={branchId}
          onValueChange={(value) => update({ branchId: value })}
          optional
          placeholder={t("acquisitions.filters.allBranches")}
          options={(meta.data?.branches ?? []).map((branch) => ({
            value: branch.id,
            label: branch.name,
            icon: BRANCH_ICON,
          }))}
        />
        <SearchableSelect
          aria-label={t("acquisitions.filters.sort")}
          value={searchParams.get("sort") ?? "created_at"}
          onValueChange={(value) => update({ sort: value })}
          searchable={false}
          options={ACQUISITION_SORT_FIELDS.map((field) => ({
            value: field,
            label: t(`acquisitions.sort.${field}`),
            icon: ACQUISITION_SORT_ICONS[field],
          }))}
        />
      </div>

      {chips.length > 0 ? (
        <FilterToolbar>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                value={chip.value}
                onRemove={() => update(chip.clear)}
              />
            ))}
          </div>
          {hasQuery ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={clear}>
              <XIcon aria-hidden />
              {t("acquisitions.filters.clear")}
            </Button>
          ) : null}
        </FilterToolbar>
      ) : null}

      <FilterToolbar>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          aria-expanded={showAdvanced}
          onClick={() => setExpanded((current) => !current)}
        >
          <ListFilterIcon aria-hidden />
          {showAdvanced ? t("acquisitions.filters.less") : t("acquisitions.filters.more")}
          {advancedCount > 0 ? (
            <Badge variant="secondary" className="ms-0.5">
              {advancedCount}
            </Badge>
          ) : null}
          <ChevronDownIcon
            className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            aria-hidden
          />
        </Button>
        <div className="ms-auto flex min-w-40 items-center gap-2">
          <SearchableSelect
            aria-label={t("acquisitions.filters.order")}
            value={searchParams.get("order") ?? "desc"}
            onValueChange={(value) => update({ order: value })}
            searchable={false}
            className="w-40"
            options={[
              { value: "desc", label: t("acquisitions.filters.desc"), icon: ORDER_ICONS.desc },
              { value: "asc", label: t("acquisitions.filters.asc"), icon: ORDER_ICONS.asc },
            ]}
          />
        </div>
      </FilterToolbar>

      {showAdvanced ? (
        <div className="grid gap-5 border-t pt-4">
          <FilterGroup title={t("acquisitions.filters.groupSource")}>
            <FormField label={t("acquisitions.filters.sourceType")} htmlFor="filter-source">
              <SearchableSelect
                id="filter-source"
                value={searchParams.get("sourceType") ?? ""}
                onValueChange={(value) => update({ sourceType: value })}
                optional
                searchable={false}
                placeholder={t("acquisitions.filters.allSourceTypes")}
                options={ACQUISITION_SOURCE_TYPES.map((type) => ({
                  value: type,
                  label: t(`acquisitions.sourceTypes.${type}`),
                  icon: ACQUISITION_SOURCE_ICONS[type],
                }))}
              />
            </FormField>
            <FormField label={t("acquisitions.filters.make")} htmlFor="filter-make">
              <SearchableSelect
                id="filter-make"
                value={makeValue}
                onValueChange={(value) => update({ make: value, model: null })}
                optional
                placeholder={t("acquisitions.filters.anyMake")}
                options={(meta.data?.makes ?? []).map((make) => ({
                  value: make.name,
                  label: make.name,
                }))}
              />
            </FormField>
            <FormField label={t("acquisitions.filters.model")} htmlFor="filter-model">
              <SearchableSelect
                id="filter-model"
                value={searchParams.get("model") ?? ""}
                onValueChange={(value) => update({ model: value })}
                optional
                placeholder={t("acquisitions.filters.anyModel")}
                options={modelOptions.map((model) => ({
                  value: model.name,
                  label: model.name,
                }))}
              />
            </FormField>
          </FilterGroup>

          <FilterGroup title={t("acquisitions.filters.groupStatus")}>
            <FormField label={t("acquisitions.filters.paymentStatus")} htmlFor="filter-payment">
              <SearchableSelect
                id="filter-payment"
                value={searchParams.get("paymentStatus") ?? ""}
                onValueChange={(value) => update({ paymentStatus: value })}
                optional
                searchable={false}
                placeholder={t("acquisitions.filters.allPaymentStatuses")}
                options={ACQUISITION_PAYMENT_STATUSES.map((status) => ({
                  value: status,
                  label: t(`acquisitions.enums.paymentStatus.${status}`),
                  icon: ACQUISITION_PAYMENT_ICONS[status],
                }))}
              />
            </FormField>
            <FormField
              label={t("acquisitions.filters.documentStatus")}
              htmlFor="filter-document"
            >
              <SearchableSelect
                id="filter-document"
                value={searchParams.get("documentStatus") ?? ""}
                onValueChange={(value) => update({ documentStatus: value })}
                optional
                searchable={false}
                placeholder={t("acquisitions.filters.allDocumentStatuses")}
                options={ACQUISITION_DOCUMENT_STATUSES.map((status) => ({
                  value: status,
                  label: t(`acquisitions.enums.documentStatus.${status}`),
                  icon: ACQUISITION_DOCUMENT_ICONS[status],
                }))}
              />
            </FormField>
            <FormField
              label={t("acquisitions.filters.registrationStatus")}
              htmlFor="filter-registration"
            >
              <SearchableSelect
                id="filter-registration"
                value={searchParams.get("registrationStatus") ?? ""}
                onValueChange={(value) => update({ registrationStatus: value })}
                optional
                searchable={false}
                placeholder={t("acquisitions.filters.allRegistrationStatuses")}
                options={ACQUISITION_REGISTRATION_STATUSES.map((status) => ({
                  value: status,
                  label: t(`acquisitions.enums.registrationStatus.${status}`),
                  icon: ACQUISITION_REGISTRATION_ICONS[status],
                }))}
              />
            </FormField>
          </FilterGroup>

          <FilterGroup title={t("acquisitions.filters.groupDates")}>
            <FormField
              label={t("acquisitions.filters.purchaseDateFrom")}
              htmlFor="filter-purchase-from"
            >
              <DebouncedFilterInput
                id="filter-purchase-from"
                type="date"
                className="h-11 md:h-10"
                value={searchParams.get("purchaseDateFrom") ?? ""}
                onCommit={(value) => update({ purchaseDateFrom: value })}
              />
            </FormField>
            <FormField
              label={t("acquisitions.filters.purchaseDateTo")}
              htmlFor="filter-purchase-to"
            >
              <DebouncedFilterInput
                id="filter-purchase-to"
                type="date"
                className="h-11 md:h-10"
                value={searchParams.get("purchaseDateTo") ?? ""}
                onCommit={(value) => update({ purchaseDateTo: value })}
              />
            </FormField>
            <FormField label={t("acquisitions.filters.createdFrom")} htmlFor="filter-created-from">
              <DebouncedFilterInput
                id="filter-created-from"
                type="date"
                className="h-11 md:h-10"
                value={searchParams.get("createdFrom") ?? ""}
                onCommit={(value) => update({ createdFrom: value })}
              />
            </FormField>
            <FormField label={t("acquisitions.filters.createdTo")} htmlFor="filter-created-to">
              <DebouncedFilterInput
                id="filter-created-to"
                type="date"
                className="h-11 md:h-10"
                value={searchParams.get("createdTo") ?? ""}
                onCommit={(value) => update({ createdTo: value })}
              />
            </FormField>
          </FilterGroup>

          {showCost ? (
            <FilterGroup title={t("acquisitions.filters.groupPrice")}>
              <FormField label={t("acquisitions.filters.priceMin")} htmlFor="filter-price-min">
                <DebouncedFilterInput
                  id="filter-price-min"
                  inputMode="decimal"
                  placeholder="0"
                  className="h-11 md:h-10"
                  value={searchParams.get("priceMin") ?? ""}
                  onCommit={(value) => update({ priceMin: value })}
                />
              </FormField>
              <FormField label={t("acquisitions.filters.priceMax")} htmlFor="filter-price-max">
                <DebouncedFilterInput
                  id="filter-price-max"
                  inputMode="decimal"
                  placeholder="500000"
                  className="h-11 md:h-10"
                  value={searchParams.get("priceMax") ?? ""}
                  onCommit={(value) => update({ priceMax: value })}
                />
              </FormField>
            </FilterGroup>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
