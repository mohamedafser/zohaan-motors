"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { CheckIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";

import { FormField } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/use-permission";
import type { CatalogMake, CatalogModel, CatalogModelYear, CatalogVariant } from "@/types/vehicle";

type CatalogPayload = {
  makes: CatalogMake[];
  models: CatalogModel[];
  years: CatalogModelYear[];
  variants: CatalogVariant[];
};

type CatalogTable = "vehicle_makes" | "vehicle_models" | "vehicle_model_years" | "vehicle_variants";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchCatalog(params: { makeId: string; modelId: string; modelYearId: string }) {
  const search = new URLSearchParams();
  if (params.makeId) search.set("makeId", params.makeId);
  if (params.modelId) search.set("modelId", params.modelId);
  if (params.modelYearId) search.set("modelYearId", params.modelYearId);
  const response = await fetch(`/api/settings/catalog?${search}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const json = (await response.json()) as { status: string; data?: CatalogPayload; message?: string };
  if (json.status !== "success" || !json.data) {
    throw new Error(json.message ?? "Failed to load catalog");
  }
  return json.data;
}

async function postCatalog(body: Record<string, unknown>) {
  const response = await fetch("/api/settings/catalog", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as { status: string; message?: string };
  if (json.status !== "success") {
    throw new Error(json.message ?? "Catalog update failed");
  }
}

export function VehicleCatalogManager() {
  const t = useTranslations("settings.catalog");
  const queryClient = useQueryClient();
  const { user } = usePermission();
  const isSuperAdmin = user?.roles.includes("super_admin") ?? false;

  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [modelYearId, setModelYearId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [brandName, setBrandName] = useState("");
  const [brandNameAr, setBrandNameAr] = useState("");
  const [modelName, setModelName] = useState("");
  const [yearValue, setYearValue] = useState("");
  const [variantName, setVariantName] = useState("");

  const query = useQuery({
    queryKey: ["settings-catalog", makeId, modelId, modelYearId],
    queryFn: () => fetchCatalog({ makeId, modelId, modelYearId }),
  });

  const mutation = useMutation({
    mutationFn: postCatalog,
    onSuccess: async () => {
      setError(null);
      for (const key of ["settings-catalog", "vehicle-brands", "vehicle-models", "vehicle-years", "vehicle-variants"]) {
        await queryClient.invalidateQueries({ queryKey: [key] });
      }
      await queryClient.invalidateQueries({ queryKey: ["inventory", "meta"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const makes = query.data?.makes ?? [];
  const models = query.data?.models ?? [];
  const years = query.data?.years ?? [];
  const variants = query.data?.variants ?? [];

  const makeOptions = useMemo(() => makes.map((m) => ({ value: m.id, label: m.name })), [makes]);
  const modelOptions = useMemo(() => models.map((m) => ({ value: m.id, label: m.name })), [models]);
  const yearOptions = useMemo(
    () => years.map((y) => ({ value: y.id, label: String(y.year) })),
    [years],
  );

  function selectMake(next: string) {
    setMakeId(next);
    setModelId("");
    setModelYearId("");
  }

  function selectModel(next: string) {
    setModelId(next);
    setModelYearId("");
  }

  function toggle(table: CatalogTable, id: string, isActive: boolean) {
    mutation.mutate({ action: "setActive", table, id, isActive: !isActive });
  }

  function add(body: Record<string, unknown>, clear: () => void) {
    mutation.mutate(body, { onSuccess: clear });
  }

  // Shared row actions for every tab; edit/delete render only for Super Admins.
  function rowActions(table: CatalogTable) {
    return {
      onToggle: (id: string, isActive: boolean) => toggle(table, id, isActive),
      onUpdate: isSuperAdmin
        ? (id: string, values: EditValues, done: () => void) =>
            mutation.mutate({ action: "update", table, id, ...values }, { onSuccess: done })
        : undefined,
      onDelete: isSuperAdmin
        ? (id: string) => {
            if (table === "vehicle_makes" && id === makeId) selectMake("");
            if (table === "vehicle_models" && id === modelId) selectModel("");
            if (table === "vehicle_model_years" && id === modelYearId) setModelYearId("");
            mutation.mutate({ action: "delete", table, id });
          }
        : undefined,
      busy: mutation.isPending,
      editKind: table === "vehicle_model_years" ? ("year" as const) : table === "vehicle_makes" ? ("brand" as const) : ("name" as const),
      emptyLabel: t("empty"),
      t,
    };
  }

  const brandSelect = (
    <FormField label={t("selectBrand")} htmlFor="catalog-brand">
      <SearchableSelect
        id="catalog-brand"
        value={makeId}
        onValueChange={selectMake}
        options={makeOptions}
        optional={false}
        placeholder={t("selectBrand")}
      />
    </FormField>
  );

  const modelSelect = (
    <FormField label={t("selectModel")} htmlFor="catalog-model">
      <SearchableSelect
        id="catalog-model"
        value={modelId}
        onValueChange={selectModel}
        options={modelOptions}
        optional={false}
        placeholder={t("selectModel")}
        disabled={!makeId}
      />
    </FormField>
  );

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="brands">
        <TabsList>
          <TabsTrigger value="brands">{t("brands")}</TabsTrigger>
          <TabsTrigger value="models">{t("models")}</TabsTrigger>
          <TabsTrigger value="years">{t("years")}</TabsTrigger>
          <TabsTrigger value="variants">{t("variants")}</TabsTrigger>
        </TabsList>

        <TabsContent value="brands">
          <Panel
            form={
              <>
                <FormField label={t("name")} htmlFor="catalog-brand-name">
                  <Input id="catalog-brand-name" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                </FormField>
                <FormField label={t("nameAr")} htmlFor="catalog-brand-name-ar">
                  <Input
                    id="catalog-brand-name-ar"
                    dir="rtl"
                    value={brandNameAr}
                    onChange={(e) => setBrandNameAr(e.target.value)}
                  />
                </FormField>
                <LoadingButton
                  type="button"
                  loading={mutation.isPending}
                  disabled={!brandName.trim()}
                  onClick={() =>
                    add(
                      {
                        action: "upsertMake",
                        name: brandName.trim(),
                        nameAr: brandNameAr.trim() || null,
                        slug: slugify(brandName),
                      },
                      () => {
                        setBrandName("");
                        setBrandNameAr("");
                      },
                    )
                  }
                >
                  {t("addBrand")}
                </LoadingButton>
              </>
            }
            items={makes.map((m) => ({ id: m.id, label: m.name, isActive: m.isActive, value: m.name, valueAr: m.nameAr }))}
            {...rowActions("vehicle_makes")}
          />
        </TabsContent>

        <TabsContent value="models">
          <Panel
            form={
              <>
                {brandSelect}
                <FormField label={t("name")} htmlFor="catalog-model-name">
                  <Input
                    id="catalog-model-name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    disabled={!makeId}
                  />
                </FormField>
                <LoadingButton
                  type="button"
                  loading={mutation.isPending}
                  disabled={!makeId || !modelName.trim()}
                  onClick={() =>
                    add(
                      { action: "upsertModel", makeId, name: modelName.trim(), slug: slugify(modelName) },
                      () => setModelName(""),
                    )
                  }
                >
                  {t("addModel")}
                </LoadingButton>
              </>
            }
            items={makeId ? models.map((m) => ({ id: m.id, label: m.name, isActive: m.isActive, value: m.name })) : null}
            {...rowActions("vehicle_models")}
            pickFirstLabel={t("selectBrand")}
          />
        </TabsContent>

        <TabsContent value="years">
          <Panel
            form={
              <>
                {brandSelect}
                {modelSelect}
                <FormField label={t("year")} htmlFor="catalog-year">
                  <Input
                    id="catalog-year"
                    type="number"
                    inputMode="numeric"
                    min={1980}
                    max={2100}
                    value={yearValue}
                    onChange={(e) => setYearValue(e.target.value)}
                    disabled={!modelId}
                  />
                </FormField>
                <LoadingButton
                  type="button"
                  loading={mutation.isPending}
                  disabled={!modelId || !/^\d{4}$/.test(yearValue)}
                  onClick={() =>
                    add({ action: "upsertYear", modelId, year: Number(yearValue), market: "UAE" }, () =>
                      setYearValue(""),
                    )
                  }
                >
                  {t("addYear")}
                </LoadingButton>
              </>
            }
            items={
              modelId
                ? years.map((y) => ({
                    id: y.id,
                    label: `${y.year} (${y.market})`,
                    isActive: y.isActive,
                    value: String(y.year),
                  }))
                : null
            }
            {...rowActions("vehicle_model_years")}
            pickFirstLabel={t("selectModel")}
          />
        </TabsContent>

        <TabsContent value="variants">
          <Panel
            form={
              <>
                {brandSelect}
                {modelSelect}
                <FormField label={t("selectYear")} htmlFor="catalog-variant-year">
                  <SearchableSelect
                    id="catalog-variant-year"
                    value={modelYearId}
                    onValueChange={setModelYearId}
                    options={yearOptions}
                    optional={false}
                    placeholder={t("selectYear")}
                    disabled={!modelId}
                  />
                </FormField>
                <FormField label={t("name")} htmlFor="catalog-variant-name">
                  <Input
                    id="catalog-variant-name"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    disabled={!modelYearId}
                  />
                </FormField>
                <LoadingButton
                  type="button"
                  loading={mutation.isPending}
                  disabled={!modelYearId || !variantName.trim()}
                  onClick={() =>
                    add(
                      {
                        action: "upsertVariant",
                        modelYearId,
                        name: variantName.trim(),
                        slug: slugify(variantName),
                      },
                      () => setVariantName(""),
                    )
                  }
                >
                  {t("addVariant")}
                </LoadingButton>
              </>
            }
            items={
              modelYearId
                ? variants.map((v) => ({ id: v.id, label: v.name, isActive: v.isActive, value: v.name }))
                : null
            }
            {...rowActions("vehicle_variants")}
            pickFirstLabel={t("selectYear")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type EditValues = { name?: string; nameAr?: string | null; year?: number };

type PanelItem = {
  id: string;
  label: string;
  isActive: boolean;
  value: string;
  valueAr?: string | null;
};

function Panel({
  form,
  items,
  onToggle,
  onUpdate,
  onDelete,
  busy,
  editKind,
  emptyLabel,
  pickFirstLabel,
  t,
}: {
  form: React.ReactNode;
  items: PanelItem[] | null;
  onToggle: (id: string, isActive: boolean) => void;
  onUpdate?: (id: string, values: EditValues, done: () => void) => void;
  onDelete?: (id: string) => void;
  busy: boolean;
  editKind: "brand" | "name" | "year";
  emptyLabel: string;
  pickFirstLabel?: string;
  t: ReturnType<typeof useTranslations<"settings.catalog">>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftAr, setDraftAr] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(item: PanelItem) {
    setDeletingId(null);
    setEditingId(item.id);
    setDraft(item.value);
    setDraftAr(item.valueAr ?? "");
  }

  const draftValid = editKind === "year" ? /^\d{4}$/.test(draft) : draft.trim().length > 0;

  function save(id: string) {
    if (!onUpdate || !draftValid) return;
    const values: EditValues =
      editKind === "year"
        ? { year: Number(draft) }
        : editKind === "brand"
          ? { name: draft.trim(), nameAr: draftAr.trim() || null }
          : { name: draft.trim() };
    onUpdate(id, values, () => setEditingId(null));
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
      <section className="flex flex-col gap-3 self-start rounded-xl border border-border bg-card p-4">
        {form}
      </section>
      <section className="self-start overflow-hidden rounded-xl border border-border bg-card">
        {items === null ? (
          <p className="text-muted-foreground p-4 text-sm">{pickFirstLabel}</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">{emptyLabel}</p>
        ) : (
          // Fits below the page header and tabs so the list's bottom edge stays on screen.
          <ul className="max-h-[max(16rem,calc(100svh-24rem))] divide-y divide-border overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                {editingId === item.id ? (
                  <form
                    className="flex flex-1 flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      save(item.id);
                    }}
                  >
                    <Input
                      autoFocus
                      aria-label={editKind === "year" ? t("year") : t("name")}
                      type={editKind === "year" ? "number" : "text"}
                      inputMode={editKind === "year" ? "numeric" : undefined}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="h-8 min-w-0 flex-1 basis-40"
                    />
                    {editKind === "brand" ? (
                      <Input
                        aria-label={t("nameAr")}
                        placeholder={t("nameAr")}
                        dir="rtl"
                        value={draftAr}
                        onChange={(e) => setDraftAr(e.target.value)}
                        className="h-8 min-w-0 flex-1 basis-40"
                      />
                    ) : null}
                    <Button type="submit" size="sm" disabled={busy || !draftValid}>
                      <CheckIcon />
                      {t("save")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <XIcon />
                      {t("cancel")}
                    </Button>
                  </form>
                ) : deletingId === item.id ? (
                  <>
                    <span className="font-medium">{t("deleteConfirm", { name: item.label })}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => {
                          onDelete?.(item.id);
                          setDeletingId(null);
                        }}
                      >
                        <Trash2Icon />
                        {t("delete")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                        {t("cancel")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className={item.isActive ? "" : "text-muted-foreground line-through"}>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? t("active") : t("inactive")}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onToggle(item.id, item.isActive)}
                      >
                        {item.isActive ? t("deactivate") : t("activate")}
                      </Button>
                      {onUpdate ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("edit")}
                          onClick={() => startEdit(item)}
                        >
                          <PencilIcon />
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          aria-label={t("delete")}
                          onClick={() => {
                            setEditingId(null);
                            setDeletingId(item.id);
                          }}
                        >
                          <Trash2Icon />
                        </Button>
                      ) : null}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
