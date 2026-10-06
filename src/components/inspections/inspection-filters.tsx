"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

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
import { DebouncedFilterInput, FilterGroup } from "@/components/shared/filter-controls";
import { ListFilterBar } from "@/components/shared/list-filter-bar";
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
  "sort",
  "order",
] as const;

export function InspectionFilters({ actions }: { actions?: React.ReactNode }) {
  const t = useTranslations();
  const { searchParams, update, clear } = useInspectionUrlState();
  const meta = useInspectionMeta();

  const activeCount = countActiveFilters(searchParams);
  const hasQuery = activeCount > 0 || Boolean(searchParams.get("q"));
  const branchId = searchParams.get("branchId") ?? "";
  const advancedCount = ADVANCED_KEYS.filter((key) => {
    if (key === "sort") return (searchParams.get("sort") ?? "updated_at") !== "updated_at";
    if (key === "order") return (searchParams.get("order") ?? "desc") !== "desc";
    return Boolean(searchParams.get(key));
  }).length;

  const chips = useMemo(() => {
    const items: {
      key: string;
      label: string;
      value: string;
      onRemove: () => void;
    }[] = [];

    const q = searchParams.get("q")?.trim();
    if (q) {
      items.push({
        key: "q",
        label: t("inspections.filters.searchLabel"),
        value: q,
        onRemove: () => update({ q: null }),
      });
    }

    const status = searchParams.get("status");
    if (status) {
      items.push({
        key: "status",
        label: t("inspections.filters.status"),
        value: t(`inspections.status.${status}`),
        onRemove: () => update({ status: null }),
      });
    }

    if (branchId) {
      const branch = meta.data?.branches.find((item) => item.id === branchId);
      items.push({
        key: "branchId",
        label: t("inspections.filters.branch"),
        value: branch?.name ?? branchId,
        onRemove: () => update({ branchId: null }),
      });
    }

    const inspectionType = searchParams.get("inspectionType");
    if (inspectionType) {
      items.push({
        key: "inspectionType",
        label: t("inspections.filters.type"),
        value: t(`inspections.types.${inspectionType}`),
        onRemove: () => update({ inspectionType: null }),
      });
    }

    const result = searchParams.get("result");
    if (result) {
      items.push({
        key: "result",
        label: t("inspections.filters.result"),
        value: t(`inspections.results.${result}`),
        onRemove: () => update({ result: null }),
      });
    }

    const assignedTo = searchParams.get("assignedTo");
    if (assignedTo) {
      const inspector = meta.data?.inspectors.find((item) => item.id === assignedTo);
      items.push({
        key: "assignedTo",
        label: t("inspections.filters.assignedTo"),
        value: inspector?.name ?? assignedTo,
        onRemove: () => update({ assignedTo: null }),
      });
    }

    if (searchParams.get("mine") === "true") {
      items.push({
        key: "mine",
        label: t("inspections.filters.mine"),
        value: t("inspections.filters.mineYes"),
        onRemove: () => update({ mine: null }),
      });
    }

    if (searchParams.get("hasCritical") === "true") {
      items.push({
        key: "hasCritical",
        label: t("inspections.filters.hasCritical"),
        value: t("inspections.filters.yes"),
        onRemove: () => update({ hasCritical: null }),
      });
    }

    if (searchParams.get("repairRequired") === "true") {
      items.push({
        key: "repairRequired",
        label: t("inspections.filters.repairRequired"),
        value: t("inspections.filters.yes"),
        onRemove: () => update({ repairRequired: null }),
      });
    }

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      items.push({
        key: "dates",
        label: t("inspections.filters.groupDates"),
        value: [dateFrom || "…", dateTo || "…"].join(" – "),
        onRemove: () => update({ dateFrom: null, dateTo: null }),
      });
    }

    return items;
  }, [branchId, meta.data?.branches, meta.data?.inspectors, searchParams, t, update]);

  return (
    <ListFilterBar
      ariaLabel={t("inspections.filters.searchLabel")}
      actions={actions}
      advancedCount={advancedCount}
      hasActiveFilters={hasQuery}
      onClear={clear}
      chips={chips}
      drawerTitle={t("inspections.filters.drawerTitle")}
      drawerDescription={t("inspections.filters.drawerHint")}
      basicFilters={
        <>
          <div className="relative sm:col-span-2 xl:col-span-1">
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
        </>
      }
      drawerContent={
        <div className="grid gap-2.5">
          <FilterGroup
            title={t("inspections.filters.groupType")}
            dense
            collapsible
            defaultOpen
            activeCount={
              ["inspectionType", "result", "assignedTo"].filter((key) =>
                Boolean(searchParams.get(key)),
              ).length
            }
          >
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

          <FilterGroup
            title={t("inspections.filters.groupFlags")}
            dense
            collapsible
            activeCount={
              ["mine", "hasCritical", "repairRequired"].filter((key) =>
                Boolean(searchParams.get(key)),
              ).length
            }
          >
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
            <FormField label={t("inspections.filters.repairRequired")} htmlFor="filter-repair">
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

          <FilterGroup
            title={t("inspections.filters.groupDates")}
            dense
            collapsible
            activeCount={
              ["dateFrom", "dateTo"].filter((key) => Boolean(searchParams.get(key))).length +
              ((searchParams.get("sort") ?? "updated_at") !== "updated_at" ? 1 : 0) +
              ((searchParams.get("order") ?? "desc") !== "desc" ? 1 : 0)
            }
          >
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
            <FormField label={t("inspections.filters.sort")} htmlFor="filter-sort">
              <SearchableSelect
                id="filter-sort"
                value={searchParams.get("sort") ?? "updated_at"}
                onValueChange={(value) => update({ sort: value })}
                searchable={false}
                options={INSPECTION_SORT_FIELDS.map((field) => ({
                  value: field,
                  label: t(`inspections.sort.${field}`),
                  icon: INSPECTION_SORT_ICONS[field],
                }))}
              />
            </FormField>
            <FormField label={t("inspections.filters.order")} htmlFor="filter-order">
              <SearchableSelect
                id="filter-order"
                value={searchParams.get("order") ?? "desc"}
                onValueChange={(value) => update({ order: value })}
                searchable={false}
                options={[
                  { value: "desc", label: t("inspections.filters.desc"), icon: ORDER_ICONS.desc },
                  { value: "asc", label: t("inspections.filters.asc"), icon: ORDER_ICONS.asc },
                ]}
              />
            </FormField>
          </FilterGroup>
        </div>
      }
    />
  );
}
