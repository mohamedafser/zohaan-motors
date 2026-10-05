"use client";

import { ChevronDownIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { FormField } from "@/components/forms/form-field";
import {
  countActiveFilters,
  useInventoryUrlState,
} from "@/components/inventory/inventory-query";
import { bodyTypeKey } from "@/components/inventory/inventory-utils";
import {
  BRANCH_ICON,
  FUEL_ICONS,
  LOCATION_ICON,
  ORDER_ICONS,
  ORIGIN_ICONS,
  SORT_ICONS,
  STATUS_ICONS,
  TRANSMISSION_ICONS,
  bodyTypeIcon,
} from "@/components/inventory/vehicle-select-icons";
import {
  DebouncedFilterInput,
  FilterChip,
  FilterGroup,
  FilterToolbar,
} from "@/components/shared/filter-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useInventoryMeta } from "@/hooks/use-vehicles";
import {
  BODY_TYPES,
  FUEL_TYPES,
  ORIGIN_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_SORT_FIELDS,
  VEHICLE_STATUSES,
} from "@/types/vehicle";

const ADVANCED_KEYS = [
  "locationId",
  "make",
  "model",
  "yearFrom",
  "yearTo",
  "originType",
  "fuelType",
  "transmission",
  "bodyType",
  "includeArchived",
] as const;

export function VehicleFilters() {
  const t = useTranslations();
  const { searchParams, update, clear } = useInventoryUrlState();
  const meta = useInventoryMeta();
  const [expanded, setExpanded] = useState(false);

  const activeCount = countActiveFilters(searchParams);
  const hasQuery = activeCount > 0 || Boolean(searchParams.get("q"));
  const branchId = searchParams.get("branchId") ?? "";
  const makeValue = searchParams.get("make") ?? "";
  const advancedCount = ADVANCED_KEYS.filter((key) => Boolean(searchParams.get(key))).length;
  const showAdvanced = expanded || advancedCount > 0;

  const locations = useMemo(() => {
    const all = meta.data?.locations ?? [];
    return branchId ? all.filter((location) => location.branchId === branchId) : all;
  }, [meta.data, branchId]);

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
        label: t("inventory.filters.search"),
        value: q,
        clear: { q: null },
      });
    }

    const status = searchParams.get("status");
    if (status) {
      items.push({
        key: "status",
        label: t("inventory.filters.status"),
        value: t(`inventory.status.${status}`),
        clear: { status: null },
      });
    }

    if (branchId) {
      const branch = meta.data?.branches.find((item) => item.id === branchId);
      items.push({
        key: "branchId",
        label: t("inventory.filters.branch"),
        value: branch?.name ?? branchId,
        clear: { branchId: null, locationId: null },
      });
    }

    const locationId = searchParams.get("locationId");
    if (locationId) {
      const location = locations.find((item) => item.id === locationId);
      items.push({
        key: "locationId",
        label: t("inventory.filters.location"),
        value: location?.name ?? locationId,
        clear: { locationId: null },
      });
    }

    if (makeValue) {
      items.push({
        key: "make",
        label: t("inventory.filters.make"),
        value: makeValue,
        clear: { make: null, model: null },
      });
    }

    const model = searchParams.get("model");
    if (model) {
      items.push({
        key: "model",
        label: t("inventory.filters.model"),
        value: model,
        clear: { model: null },
      });
    }

    const bodyType = searchParams.get("bodyType");
    if (bodyType) {
      items.push({
        key: "bodyType",
        label: t("inventory.filters.bodyType"),
        value: t(`inventory.enums.bodyType.${bodyTypeKey(bodyType)}`),
        clear: { bodyType: null },
      });
    }

    const yearFrom = searchParams.get("yearFrom");
    const yearTo = searchParams.get("yearTo");
    if (yearFrom || yearTo) {
      items.push({
        key: "year",
        label: t("inventory.filters.year"),
        value: [yearFrom || "…", yearTo || "…"].join(" – "),
        clear: { yearFrom: null, yearTo: null },
      });
    }

    const originType = searchParams.get("originType");
    if (originType) {
      items.push({
        key: "originType",
        label: t("inventory.filters.origin"),
        value: t(`inventory.enums.origin.${originType}`),
        clear: { originType: null },
      });
    }

    const fuelType = searchParams.get("fuelType");
    if (fuelType) {
      items.push({
        key: "fuelType",
        label: t("inventory.filters.fuelType"),
        value: t(`inventory.enums.fuel.${fuelType}`),
        clear: { fuelType: null },
      });
    }

    const transmission = searchParams.get("transmission");
    if (transmission) {
      items.push({
        key: "transmission",
        label: t("inventory.filters.transmission"),
        value: t(`inventory.enums.transmission.${transmission}`),
        clear: { transmission: null },
      });
    }

    if (searchParams.get("includeArchived") === "true") {
      items.push({
        key: "includeArchived",
        label: t("inventory.filters.includeArchived"),
        value: t("common.yes"),
        clear: { includeArchived: null },
      });
    }

    return items;
  }, [branchId, locations, makeValue, meta.data?.branches, searchParams, t]);

  return (
    <section
      className="bg-card flex flex-col gap-3 rounded-xl border p-3 md:p-4"
      aria-label={t("inventory.filters.searchLabel")}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative lg:col-span-1">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <DebouncedFilterInput
            type="search"
            inputMode="search"
            aria-label={t("inventory.filters.searchLabel")}
            placeholder={t("inventory.filters.searchPlaceholder")}
            className="h-11 ps-9 md:h-10"
            value={searchParams.get("q") ?? ""}
            onCommit={(value) => update({ q: value })}
          />
        </div>
        <SearchableSelect
          aria-label={t("inventory.filters.status")}
          value={searchParams.get("status") ?? ""}
          onValueChange={(value) => update({ status: value })}
          optional
          placeholder={t("inventory.filters.allStatuses")}
          options={VEHICLE_STATUSES.map((status) => ({
            value: status,
            label: t(`inventory.status.${status}`),
            icon: STATUS_ICONS[status],
          }))}
        />
        <SearchableSelect
          aria-label={t("inventory.filters.branch")}
          value={branchId}
          onValueChange={(value) => update({ branchId: value, locationId: null })}
          optional
          placeholder={t("inventory.filters.allBranches")}
          options={(meta.data?.branches ?? []).map((branch) => ({
            value: branch.id,
            label: branch.name,
            icon: BRANCH_ICON,
          }))}
        />
        <SearchableSelect
          aria-label={t("inventory.filters.sort")}
          value={searchParams.get("sort") ?? "created_at"}
          onValueChange={(value) => update({ sort: value })}
          searchable={false}
          options={VEHICLE_SORT_FIELDS.map((field) => ({
            value: field,
            label: t(`inventory.sort.${field}`),
            icon: SORT_ICONS[field],
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
              {t("inventory.filters.clear")}
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
          {showAdvanced ? t("inventory.filters.less") : t("inventory.filters.more")}
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
            aria-label={t("inventory.filters.order")}
            value={searchParams.get("order") ?? "desc"}
            onValueChange={(value) => update({ order: value })}
            searchable={false}
            className="w-40"
            options={[
              { value: "desc", label: t("inventory.filters.desc"), icon: ORDER_ICONS.desc },
              { value: "asc", label: t("inventory.filters.asc"), icon: ORDER_ICONS.asc },
            ]}
          />
        </div>
      </FilterToolbar>

      {showAdvanced ? (
        <div className="grid gap-5 border-t pt-4">
          <FilterGroup title={t("inventory.filters.groupVehicle")}>
            <FormField label={t("inventory.filters.location")} htmlFor="filter-location">
              <SearchableSelect
                id="filter-location"
                value={searchParams.get("locationId") ?? ""}
                onValueChange={(value) => update({ locationId: value })}
                optional
                placeholder={t("inventory.filters.allLocations")}
                options={locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                  icon: LOCATION_ICON,
                }))}
              />
            </FormField>
            <FormField label={t("inventory.filters.make")} htmlFor="filter-make">
              <SearchableSelect
                id="filter-make"
                value={makeValue}
                onValueChange={(value) => update({ make: value, model: null })}
                optional
                placeholder={t("inventory.filters.anyMake")}
                options={(meta.data?.makes ?? []).map((make) => ({
                  value: make.name,
                  label: make.name,
                }))}
              />
            </FormField>
            <FormField label={t("inventory.filters.model")} htmlFor="filter-model">
              <SearchableSelect
                id="filter-model"
                value={searchParams.get("model") ?? ""}
                onValueChange={(value) => update({ model: value })}
                optional
                placeholder={t("inventory.filters.anyModel")}
                options={modelOptions.map((model) => ({
                  value: model.name,
                  label: model.name,
                }))}
              />
            </FormField>
            <FormField label={t("inventory.filters.bodyType")} htmlFor="filter-body">
              <SearchableSelect
                id="filter-body"
                value={searchParams.get("bodyType") ?? ""}
                onValueChange={(value) => update({ bodyType: value })}
                optional
                placeholder={t("inventory.filters.allBodyTypes")}
                options={BODY_TYPES.map((type) => ({
                  value: type,
                  label: t(`inventory.enums.bodyType.${bodyTypeKey(type)}`),
                  icon: bodyTypeIcon(type),
                }))}
              />
            </FormField>
          </FilterGroup>

          <FilterGroup title={t("inventory.filters.groupSpecs")}>
            <FormField label={t("inventory.filters.yearFrom")} htmlFor="filter-year-from">
              <DebouncedFilterInput
                id="filter-year-from"
                inputMode="numeric"
                maxLength={4}
                placeholder="2018"
                className="h-11 md:h-10"
                value={searchParams.get("yearFrom") ?? ""}
                onCommit={(value) => update({ yearFrom: value })}
              />
            </FormField>
            <FormField label={t("inventory.filters.yearTo")} htmlFor="filter-year-to">
              <DebouncedFilterInput
                id="filter-year-to"
                inputMode="numeric"
                maxLength={4}
                placeholder="2024"
                className="h-11 md:h-10"
                value={searchParams.get("yearTo") ?? ""}
                onCommit={(value) => update({ yearTo: value })}
              />
            </FormField>
            <FormField label={t("inventory.filters.origin")} htmlFor="filter-origin">
              <SearchableSelect
                id="filter-origin"
                value={searchParams.get("originType") ?? ""}
                onValueChange={(value) => update({ originType: value })}
                optional
                searchable={false}
                placeholder={t("inventory.filters.allOrigins")}
                options={ORIGIN_TYPES.map((type) => ({
                  value: type,
                  label: t(`inventory.enums.origin.${type}`),
                  icon: ORIGIN_ICONS[type],
                }))}
              />
            </FormField>
            <FormField label={t("inventory.filters.fuelType")} htmlFor="filter-fuel">
              <SearchableSelect
                id="filter-fuel"
                value={searchParams.get("fuelType") ?? ""}
                onValueChange={(value) => update({ fuelType: value })}
                optional
                searchable={false}
                placeholder={t("inventory.filters.allFuelTypes")}
                options={FUEL_TYPES.map((type) => ({
                  value: type,
                  label: t(`inventory.enums.fuel.${type}`),
                  icon: FUEL_ICONS[type],
                }))}
              />
            </FormField>
            <FormField label={t("inventory.filters.transmission")} htmlFor="filter-transmission">
              <SearchableSelect
                id="filter-transmission"
                value={searchParams.get("transmission") ?? ""}
                onValueChange={(value) => update({ transmission: value })}
                optional
                searchable={false}
                placeholder={t("inventory.filters.allTransmissions")}
                options={TRANSMISSION_TYPES.map((type) => ({
                  value: type,
                  label: t(`inventory.enums.transmission.${type}`),
                  icon: TRANSMISSION_ICONS[type],
                }))}
              />
            </FormField>
            <div className="flex items-end pb-2.5 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-archived"
                  checked={searchParams.get("includeArchived") === "true"}
                  onCheckedChange={(checked) =>
                    update({ includeArchived: checked ? "true" : null })
                  }
                />
                <Label htmlFor="filter-archived" className="cursor-pointer">
                  {t("inventory.filters.includeArchived")}
                </Label>
              </div>
            </div>
          </FilterGroup>
        </div>
      ) : null}
    </section>
  );
}
