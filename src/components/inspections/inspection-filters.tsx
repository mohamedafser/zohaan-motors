"use client";

import { ChevronDownIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  countActiveFilters,
  useInspectionUrlState,
} from "@/components/inspections/inspection-query";
import {
  BRANCH_ICON,
  INSPECTION_RESULT_ICONS,
  INSPECTION_SORT_ICONS,
  INSPECTION_STATUS_ICONS,
  INSPECTION_TYPE_ICONS,
  ORDER_ICONS,
  USER_ICON,
} from "@/components/inspections/inspection-select-icons";
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
import { useInspectionMeta } from "@/hooks/use-inspections";
import {
  INSPECTION_RESULTS,
  INSPECTION_SORT_FIELDS,
  INSPECTION_STATUSES,
  INSPECTION_TYPES,
} from "@/types/inspection";

const ADVANCED_KEYS = [
  "inspectionType",
  "result",
  "assignedTo",
  "inspectedBy",
  "mine",
  "hasCritical",
  "repairRequired",
  "dateFrom",
  "dateTo",
] as const;

export function InspectionFilters() {
  const t = useTranslations();
  const { searchParams, update, clear } = useInspectionUrlState();
  const meta = useInspectionMeta();
  const [expanded, setExpanded] = useState(false);

  const activeCount = countActiveFilters(searchParams);
  const hasQuery = activeCount > 0 || Boolean(searchParams.get("q"));
  const branchId = searchParams.get("branchId") ?? "";
  const advancedCount = ADVANCED_KEYS.filter((key) => Boolean(searchParams.get(key))).length;
  const showAdvanced = expanded || advancedCount > 0;

  const chips = useMemo(() => {
    const items: { key: string; label: string; value: string; clear: Record<string, null> }[] =
      [];

    const q = searchParams.get("q")?.trim();
    if (q) {
      items.push({
        key: "q",
        label: t("inspections.filters.searchLabel"),
        value: q,
        clear: { q: null },
      });
    }

    const status = searchParams.get("status");
    if (status) {
      items.push({
        key: "status",
        label: t("inspections.filters.status"),
        value: t(`inspections.status.${status}`),
        clear: { status: null },
      });
    }

    if (branchId) {
      const branch = meta.data?.branches.find((item) => item.id === branchId);
      items.push({
        key: "branchId",
        label: t("inspections.filters.branch"),
        value: branch?.name ?? branchId,
        clear: { branchId: null },
      });
    }

    const inspectionType = searchParams.get("inspectionType");
    if (inspectionType) {
      items.push({
        key: "inspectionType",
        label: t("inspections.filters.type"),
        value: t(`inspections.types.${inspectionType}`),
        clear: { inspectionType: null },
      });
    }

    const result = searchParams.get("result");
    if (result) {
      items.push({
        key: "result",
        label: t("inspections.filters.result"),
        value: t(`inspections.results.${result}`),
        clear: { result: null },
      });
    }

    if (searchParams.get("mine") === "true") {
      items.push({
        key: "mine",
        label: t("inspections.filters.mine"),
        value: t("inspections.filters.mineYes"),
        clear: { mine: null },
      });
    }

    if (searchParams.get("hasCritical") === "true") {
      items.push({
        key: "hasCritical",
        label: t("inspections.filters.hasCritical"),
        value: t("inspections.filters.yes"),
        clear: { hasCritical: null },
      });
    }

    if (searchParams.get("repairRequired") === "true") {
      items.push({
        key: "repairRequired",
        label: t("inspections.filters.repairRequired"),
        value: t("inspections.filters.yes"),
        clear: { repairRequired: null },
      });
    }

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      items.push({
        key: "dates",
        label: t("inspections.filters.dateFrom"),
        value: [dateFrom || "…", dateTo || "…"].join(" – "),
        clear: { dateFrom: null, dateTo: null },
      });
    }

    return items;
  }, [branchId, meta.data?.branches, searchParams, t]);

  return (
    <section
      className="bg-card flex flex-col gap-3 rounded-xl border p-3 md:p-4"
      aria-label={t("inspections.filters.searchLabel")}
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
            aria-label={t("inspections.filters.searchLabel")}
            placeholder={t("inspections.filters.searchPlaceholder")}
            className="h-11 ps-9 md:h-10"
            value={searchParams.get("q") ?? ""}
            onCommit={(value) => update({ q: value })}
          />
        </div>
        <SearchableSelect
          aria-label={t("inspections.filters.status")}
          value={searchParams.get("status") ?? ""}
          onValueChange={(value) => update({ status: value })}
          optional
          placeholder={t("inspections.filters.allStatuses")}
          options={INSPECTION_STATUSES.map((status) => ({
            value: status,
            label: t(`inspections.status.${status}`),
            icon: INSPECTION_STATUS_ICONS[status],
          }))}
        />
        <SearchableSelect
          aria-label={t("inspections.filters.branch")}
          value={branchId}
          onValueChange={(value) => update({ branchId: value })}
          optional
          placeholder={t("inspections.filters.allBranches")}
          options={(meta.data?.branches ?? []).map((branch) => ({
            value: branch.id,
            label: branch.name,
            icon: BRANCH_ICON,
          }))}
        />
        <SearchableSelect
          aria-label={t("inspections.filters.sort")}
          value={searchParams.get("sort") ?? "updated_at"}
          onValueChange={(value) => update({ sort: value })}
          searchable={false}
          options={INSPECTION_SORT_FIELDS.map((field) => ({
            value: field,
            label: t(`inspections.sort.${field}`),
            icon: INSPECTION_SORT_ICONS[field],
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
              {t("inspections.filters.clear")}
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
          {showAdvanced ? t("inspections.filters.less") : t("inspections.filters.more")}
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
            aria-label={t("inspections.filters.order")}
            value={searchParams.get("order") ?? "desc"}
            onValueChange={(value) => update({ order: value })}
            searchable={false}
            className="w-40"
            options={[
              { value: "desc", label: t("inspections.filters.desc"), icon: ORDER_ICONS.desc },
              { value: "asc", label: t("inspections.filters.asc"), icon: ORDER_ICONS.asc },
            ]}
          />
        </div>
      </FilterToolbar>

      {showAdvanced ? (
        <div className="grid gap-5 border-t pt-4">
          <FilterGroup title={t("inspections.filters.groupType")}>
            <FormField label={t("inspections.filters.type")} htmlFor="filter-type">
              <SearchableSelect
                id="filter-type"
                value={searchParams.get("inspectionType") ?? ""}
                onValueChange={(value) => update({ inspectionType: value })}
                optional
                searchable={false}
                placeholder={t("inspections.filters.allTypes")}
                options={INSPECTION_TYPES.map((type) => ({
                  value: type,
                  label: t(`inspections.types.${type}`),
                  icon: INSPECTION_TYPE_ICONS[type],
                }))}
              />
            </FormField>
            <FormField label={t("inspections.filters.result")} htmlFor="filter-result">
              <SearchableSelect
                id="filter-result"
                value={searchParams.get("result") ?? ""}
                onValueChange={(value) => update({ result: value })}
                optional
                searchable={false}
                placeholder={t("inspections.filters.allResults")}
                options={INSPECTION_RESULTS.map((result) => ({
                  value: result,
                  label: t(`inspections.results.${result}`),
                  icon: INSPECTION_RESULT_ICONS[result],
                }))}
              />
            </FormField>
            <FormField label={t("inspections.filters.assignedTo")} htmlFor="filter-assigned">
              <SearchableSelect
                id="filter-assigned"
                value={searchParams.get("assignedTo") ?? ""}
                onValueChange={(value) => update({ assignedTo: value })}
                optional
                placeholder={t("inspections.filters.anyAssignee")}
                options={(meta.data?.inspectors ?? []).map((inspector) => ({
                  value: inspector.id,
                  label: inspector.name,
                  icon: USER_ICON,
                }))}
              />
            </FormField>
          </FilterGroup>

          <FilterGroup title={t("inspections.filters.groupFlags")}>
            <FormField label={t("inspections.filters.mine")} htmlFor="filter-mine">
              <SearchableSelect
                id="filter-mine"
                value={searchParams.get("mine") === "true" ? "true" : ""}
                onValueChange={(value) => update({ mine: value || null })}
                optional
                searchable={false}
                placeholder={t("inspections.filters.any")}
                options={[{ value: "true", label: t("inspections.filters.mineYes") }]}
              />
            </FormField>
            <FormField label={t("inspections.filters.hasCritical")} htmlFor="filter-critical">
              <SearchableSelect
                id="filter-critical"
                value={searchParams.get("hasCritical") === "true" ? "true" : ""}
                onValueChange={(value) => update({ hasCritical: value || null })}
                optional
                searchable={false}
                placeholder={t("inspections.filters.any")}
                options={[{ value: "true", label: t("inspections.filters.yes") }]}
              />
            </FormField>
            <FormField
              label={t("inspections.filters.repairRequired")}
              htmlFor="filter-repair"
            >
              <SearchableSelect
                id="filter-repair"
                value={searchParams.get("repairRequired") === "true" ? "true" : ""}
                onValueChange={(value) => update({ repairRequired: value || null })}
                optional
                searchable={false}
                placeholder={t("inspections.filters.any")}
                options={[{ value: "true", label: t("inspections.filters.yes") }]}
              />
            </FormField>
          </FilterGroup>

          <FilterGroup title={t("inspections.filters.groupDates")}>
            <FormField label={t("inspections.filters.dateFrom")} htmlFor="filter-date-from">
              <DebouncedFilterInput
                id="filter-date-from"
                type="date"
                className="h-11 md:h-10"
                value={searchParams.get("dateFrom") ?? ""}
                onCommit={(value) => update({ dateFrom: value })}
              />
            </FormField>
            <FormField label={t("inspections.filters.dateTo")} htmlFor="filter-date-to">
              <DebouncedFilterInput
                id="filter-date-to"
                type="date"
                className="h-11 md:h-10"
                value={searchParams.get("dateTo") ?? ""}
                onCommit={(value) => update({ dateTo: value })}
              />
            </FormField>
          </FilterGroup>
        </div>
      ) : null}
    </section>
  );
}
