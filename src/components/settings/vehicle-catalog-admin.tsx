"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePermission } from "@/hooks/use-permission";
import type { CatalogMake, CatalogModel, CatalogModelYear, CatalogVariant } from "@/types/vehicle";

type CatalogPayload = {
  makes: CatalogMake[];
  models: CatalogModel[];
  years: CatalogModelYear[];
  variants: CatalogVariant[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchCatalog(params: {
  makeId?: string;
  modelId?: string;
  modelYearId?: string;
}): Promise<CatalogPayload> {
  const search = new URLSearchParams();
  if (params.makeId) search.set("makeId", params.makeId);
  if (params.modelId) search.set("modelId", params.modelId);
  if (params.modelYearId) search.set("modelYearId", params.modelYearId);
  const response = await fetch(`/api/settings/catalog?${search}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const json = (await response.json()) as {
    status: string;
    data?: CatalogPayload;
    message?: string;
  };
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

export function VehicleCatalogAdmin() {
  const t = useTranslations("settings.catalog");
  const { can } = usePermission();
  const canManage = can("settings.manage");
  const queryClient = useQueryClient();

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
      await queryClient.invalidateQueries({ queryKey: ["settings-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicle-brands"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicle-models"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicle-years"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicle-variants"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "meta"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const makes = query.data?.makes ?? [];
  const models = query.data?.models ?? [];
  const years = query.data?.years ?? [];
  const variants = query.data?.variants ?? [];

  const makeOptions = useMemo(
    () => makes.map((make) => ({ value: make.id, label: make.name })),
    [makes],
  );
  const modelOptions = useMemo(
    () => models.map((model) => ({ value: model.id, label: model.name })),
    [models],
  );
  const yearOptions = useMemo(
    () => years.map((year) => ({ value: year.id, label: String(year.year) })),
    [years],
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {!canManage ? (
          <p className="text-muted-foreground text-sm">{t("manageHint")}</p>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="grid gap-3 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">{t("brands")}</h3>
            <FormField label={t("name")} htmlFor="catalog-brand-name">
              <Input
                id="catalog-brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                disabled={!canManage}
              />
            </FormField>
            <FormField label={t("nameAr")} htmlFor="catalog-brand-name-ar">
              <Input
                id="catalog-brand-name-ar"
                value={brandNameAr}
                onChange={(e) => setBrandNameAr(e.target.value)}
                disabled={!canManage}
              />
            </FormField>
            <LoadingButton
              type="button"
              loading={mutation.isPending}
              disabled={!canManage || !brandName.trim()}
              onClick={() =>
                mutation.mutate({
                  action: "upsertMake",
                  name: brandName.trim(),
                  nameAr: brandNameAr.trim() || null,
                  slug: slugify(brandName),
                })
              }
            >
              {t("addBrand")}
            </LoadingButton>
            <ul className="max-h-48 space-y-2 overflow-auto text-sm">
              {makes.map((make) => (
                <li key={make.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="hover:text-brand text-start"
                    onClick={() => {
                      setMakeId(make.id);
                      setModelId("");
                      setModelYearId("");
                    }}
                  >
                    {make.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge variant={make.isActive ? "default" : "secondary"}>
                      {make.isActive ? t("active") : t("inactive")}
                    </Badge>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          mutation.mutate({
                            action: "setActive",
                            table: "vehicle_makes",
                            id: make.id,
                            isActive: !make.isActive,
                          })
                        }
                      >
                        {make.isActive ? t("deactivate") : t("activate")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">{t("models")}</h3>
            <FormField label={t("selectBrand")} htmlFor="catalog-select-brand">
              <SearchableSelect
                id="catalog-select-brand"
                value={makeId}
                onValueChange={(next) => {
                  setMakeId(next);
                  setModelId("");
                  setModelYearId("");
                }}
                options={makeOptions}
                optional={false}
                placeholder={t("selectBrand")}
              />
            </FormField>
            <FormField label={t("name")} htmlFor="catalog-model-name">
              <Input
                id="catalog-model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={!canManage || !makeId}
              />
            </FormField>
            <LoadingButton
              type="button"
              loading={mutation.isPending}
              disabled={!canManage || !makeId || !modelName.trim()}
              onClick={() =>
                mutation.mutate({
                  action: "upsertModel",
                  makeId,
                  name: modelName.trim(),
                  slug: slugify(modelName),
                })
              }
            >
              {t("addModel")}
            </LoadingButton>
            <ul className="max-h-48 space-y-2 overflow-auto text-sm">
              {models.length === 0 ? (
                <li className="text-muted-foreground">{t("empty")}</li>
              ) : (
                models.map((model) => (
                  <li key={model.id} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="hover:text-brand text-start"
                      onClick={() => {
                        setModelId(model.id);
                        setModelYearId("");
                      }}
                    >
                      {model.name}
                    </button>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          mutation.mutate({
                            action: "setActive",
                            table: "vehicle_models",
                            id: model.id,
                            isActive: !model.isActive,
                          })
                        }
                      >
                        {model.isActive ? t("deactivate") : t("activate")}
                      </Button>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="grid gap-3 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">{t("years")}</h3>
            <FormField label={t("selectModel")} htmlFor="catalog-select-model">
              <SearchableSelect
                id="catalog-select-model"
                value={modelId}
                onValueChange={(next) => {
                  setModelId(next);
                  setModelYearId("");
                }}
                options={modelOptions}
                optional={false}
                placeholder={t("selectModel")}
                disabled={!makeId}
              />
            </FormField>
            <FormField label={t("year")} htmlFor="catalog-year">
              <Input
                id="catalog-year"
                type="number"
                inputMode="numeric"
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
                disabled={!canManage || !modelId}
              />
            </FormField>
            <LoadingButton
              type="button"
              loading={mutation.isPending}
              disabled={!canManage || !modelId || !yearValue}
              onClick={() =>
                mutation.mutate({
                  action: "upsertYear",
                  modelId,
                  year: Number(yearValue),
                  market: "UAE",
                })
              }
            >
              {t("addYear")}
            </LoadingButton>
            <ul className="max-h-48 space-y-2 overflow-auto text-sm">
              {years.length === 0 ? (
                <li className="text-muted-foreground">{t("empty")}</li>
              ) : (
                years.map((year) => (
                  <li key={year.id} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="hover:text-brand text-start"
                      onClick={() => setModelYearId(year.id)}
                    >
                      {year.year} ({year.market})
                    </button>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          mutation.mutate({
                            action: "setActive",
                            table: "vehicle_model_years",
                            id: year.id,
                            isActive: !year.isActive,
                          })
                        }
                      >
                        {year.isActive ? t("deactivate") : t("activate")}
                      </Button>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="grid gap-3 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">{t("variants")}</h3>
            <FormField label={t("selectYear")} htmlFor="catalog-select-year">
              <SearchableSelect
                id="catalog-select-year"
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
                disabled={!canManage || !modelYearId}
              />
            </FormField>
            <LoadingButton
              type="button"
              loading={mutation.isPending}
              disabled={!canManage || !modelYearId || !variantName.trim()}
              onClick={() =>
                mutation.mutate({
                  action: "upsertVariant",
                  modelYearId,
                  name: variantName.trim(),
                  slug: slugify(variantName),
                })
              }
            >
              {t("addVariant")}
            </LoadingButton>
            <ul className="max-h-48 space-y-2 overflow-auto text-sm">
              {variants.length === 0 ? (
                <li className="text-muted-foreground">{t("empty")}</li>
              ) : (
                variants.map((variant) => (
                  <li key={variant.id} className="flex items-center justify-between gap-2">
                    <span>{variant.name}</span>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          mutation.mutate({
                            action: "setActive",
                            table: "vehicle_variants",
                            id: variant.id,
                            isActive: !variant.isActive,
                          })
                        }
                      >
                        {variant.isActive ? t("deactivate") : t("activate")}
                      </Button>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
