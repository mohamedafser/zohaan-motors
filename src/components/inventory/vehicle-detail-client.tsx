"use client";

import {
  ArchiveIcon,
  ArrowLeftRightIcon,
  CameraIcon,
  FileTextIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  RefreshCwIcon,
  TagsIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { PermissionGate } from "@/components/auth/permission-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  bodyTypeLabel,
  enumLabel,
  useAppLocale,
  vehicleTitle,
} from "@/components/inventory/inventory-utils";
import { VehicleArchiveDialog } from "@/components/inventory/vehicle-archive-dialog";
import { VehicleColorDisplay } from "@/components/inventory/vehicle-color-field";
import { VehicleDocumentsPanel } from "@/components/inventory/vehicle-documents-panel";
import { VehicleHistory } from "@/components/inventory/vehicle-history";
import { VehicleImageManager } from "@/components/inventory/vehicle-image-manager";
import { MarketTypeBadge } from "@/components/inventory/market-type-badge";
import { VehicleReadyForSalePanel } from "@/components/inventory/vehicle-ready-for-sale-panel";
import { VehicleStatusBadge } from "@/components/inventory/vehicle-status-badge";
import { VehicleStatusDialog } from "@/components/inventory/vehicle-status-dialog";
import { VehicleTransferDialog } from "@/components/inventory/vehicle-transfer-dialog";
import { VehiclePricingPanel } from "@/components/pricing/vehicle-pricing-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVehicle } from "@/hooks/use-vehicles";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { countryFlag, findCountryByName } from "@/lib/vehicles/countries";
import { canArchiveStatus, getGenericStatusChangeOptions } from "@/lib/vehicles/status-transitions";
import type { VehicleDetail } from "@/types/vehicle";

const DETAIL_TABS = [
  "overview",
  "acquisition",
  "pricing",
  "photos",
  "documents",
  "history",
] as const;

type DetailTab = (typeof DETAIL_TABS)[number];

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  const t = useTranslations();
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="bg-muted/30 grid gap-1 rounded-xl px-3.5 py-3">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium wrap-break-word",
          empty && "text-muted-foreground font-normal",
        )}
      >
        {empty ? t("inventory.fields.notSet") : value}
      </dd>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2.5 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

function Overview({ vehicle }: { vehicle: VehicleDetail }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const date = (value: string | null) => (value ? formatDate(value, locale, "medium") : null);
  const dateTime = (value: string | null) => (value ? formatDate(value, locale, "dateTime") : null);
  const money = (value: number | null | undefined) =>
    value == null ? null : formatCurrency(value, locale);

  const hasPrivate =
    vehicle.totalAcquisitionCost !== undefined ||
    vehicle.minimumSellingPrice !== undefined ||
    vehicle.currentSellingPrice != null;

  const country = findCountryByName(vehicle.countryOfOrigin);
  const countryDisplay = vehicle.countryOfOrigin ? (
    <span className="inline-flex items-center gap-2">
      <span className="text-base leading-none" aria-hidden>
        {country ? countryFlag(country.code) : "🏳️"}
      </span>
      {vehicle.countryOfOrigin}
    </span>
  ) : null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <DetailCard title={t("inventory.detail.identity")}>
        <DetailItem label={t("inventory.fields.stockId")} value={vehicle.stockNumber} />
        <DetailItem
          label={t("inventory.fields.status")}
          value={<VehicleStatusBadge status={vehicle.status} />}
        />
        <DetailItem
          label={t("inventory.fields.vin")}
          value={vehicle.vin ? <span className="font-mono">{vehicle.vin}</span> : null}
        />
        <DetailItem
          label={t("inventory.fields.chassis")}
          value={
            vehicle.chassisNumber ? (
              <span className="font-mono">{vehicle.chassisNumber}</span>
            ) : null
          }
        />
        <DetailItem label={t("inventory.fields.brand")} value={vehicle.make} />
        <DetailItem label={t("inventory.fields.model")} value={vehicle.model} />
        <DetailItem label={t("inventory.fields.variant")} value={vehicle.variant} />
        <DetailItem label={t("inventory.fields.year")} value={String(vehicle.year)} />
        <DetailItem
          label={t("inventory.fields.marketType")}
          value={<MarketTypeBadge value={vehicle.marketType} />}
        />
        <DetailItem
          label={t("inventory.fields.mileage")}
          value={t("inventory.detail.mileageValue", {
            value: formatNumber(vehicle.mileage, locale),
            unit: t(`inventory.enums.mileageUnit.${vehicle.mileageUnit}`),
          })}
        />
      </DetailCard>

      <DetailCard title={t("inventory.detail.specs")}>
        <DetailItem
          label={t("inventory.fields.bodyType")}
          value={bodyTypeLabel(t, vehicle.bodyType)}
        />
        <DetailItem
          label={t("inventory.fields.transmission")}
          value={enumLabel(t, "transmission", vehicle.transmission)}
        />
        <DetailItem
          label={t("inventory.fields.fuelType")}
          value={enumLabel(t, "fuel", vehicle.fuelType)}
        />
        <DetailItem label={t("inventory.fields.engineSize")} value={vehicle.engineSize} />
        <DetailItem
          label={t("inventory.fields.engineCylinders")}
          value={vehicle.engineCylinders?.toString()}
        />
        <DetailItem
          label={t("inventory.fields.driveType")}
          value={enumLabel(t, "drive", vehicle.driveType)}
        />
        <DetailItem label={t("inventory.fields.seats")} value={vehicle.seats?.toString()} />
        <DetailItem label={t("inventory.fields.doors")} value={vehicle.doors?.toString()} />
      </DetailCard>

      <DetailCard title={t("inventory.detail.appearance")}>
        <DetailItem
          label={t("inventory.fields.exteriorColor")}
          value={
            vehicle.exteriorColor ? <VehicleColorDisplay value={vehicle.exteriorColor} /> : null
          }
        />
        <DetailItem
          label={t("inventory.fields.interiorColor")}
          value={
            vehicle.interiorColor ? <VehicleColorDisplay value={vehicle.interiorColor} /> : null
          }
        />
      </DetailCard>

      <DetailCard title={t("inventory.detail.originLocation")}>
        <DetailItem
          label={t("inventory.fields.origin")}
          value={enumLabel(t, "origin", vehicle.originType)}
        />
        <DetailItem label={t("inventory.fields.countryOfOrigin")} value={countryDisplay} />
        <DetailItem label={t("inventory.fields.branch")} value={vehicle.branchName} />
        <DetailItem label={t("inventory.fields.location")} value={vehicle.locationName} />
        <DetailItem label={t("inventory.fields.purchaseDate")} value={date(vehicle.purchaseDate)} />
        <DetailItem
          label={t("inventory.fields.registrationDate")}
          value={date(vehicle.registrationDate)}
        />
        <DetailItem
          label={t("inventory.fields.registrationExpiry")}
          value={date(vehicle.registrationExpiry)}
        />
      </DetailCard>

      {hasPrivate ? (
        <DetailCard title={t("inventory.detail.summary")}>
          {vehicle.totalAcquisitionCost !== undefined ? (
            <DetailItem
              label={t("inventory.fields.acquisitionCost")}
              value={money(vehicle.totalAcquisitionCost)}
            />
          ) : null}
          {vehicle.currentSellingPrice != null ? (
            <DetailItem
              label={t("inventory.fields.sellingPrice")}
              value={money(vehicle.currentSellingPrice)}
            />
          ) : null}
          {vehicle.minimumSellingPrice !== undefined ? (
            <DetailItem
              label={t("inventory.fields.minimumPrice")}
              value={money(vehicle.minimumSellingPrice)}
            />
          ) : null}
        </DetailCard>
      ) : null}

      {vehicle.acquisition ? (
        <DetailCard title={t("inventory.sections.acquisition")}>
          <DetailItem
            label={t("inventory.fields.acquisitionNumber")}
            value={vehicle.acquisition.acquisitionNumber}
          />
          <DetailItem
            label={t("inventory.fields.acquisitionStatus")}
            value={t(`acquisitions.status.${vehicle.acquisition.status}`)}
          />
          <div className="sm:col-span-2">
            <Link
              href={`/inventory/${vehicle.id}?tab=acquisition`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("inventory.actions.viewAcquisition")}
            </Link>
          </div>
        </DetailCard>
      ) : null}

      <DetailCard title={t("inventory.sections.notes")}>
        <div className="sm:col-span-2">
          <DetailItem
            label={t("inventory.fields.notes")}
            value={
              vehicle.description ? (
                <span className="whitespace-pre-wrap">{vehicle.description}</span>
              ) : null
            }
          />
        </div>
      </DetailCard>

      <DetailCard title={t("inventory.detail.audit")}>
        <DetailItem label={t("inventory.fields.createdAt")} value={dateTime(vehicle.createdAt)} />
        <DetailItem label={t("inventory.fields.createdBy")} value={vehicle.createdByName} />
        <DetailItem label={t("inventory.fields.updatedAt")} value={dateTime(vehicle.updatedAt)} />
        <DetailItem label={t("inventory.fields.updatedBy")} value={vehicle.updatedByName} />
      </DetailCard>
    </div>
  );
}

function AcquisitionPanel({ vehicle }: { vehicle: VehicleDetail }) {
  const t = useTranslations();
  const locale = useAppLocale();
  const acquisition = vehicle.acquisition;
  const isActive =
    acquisition != null && acquisition.status !== "cancelled" && acquisition.status !== "rejected";
  const date = (value: string | null | undefined) =>
    value ? formatDate(value, locale, "medium") : null;
  const money = (value: number | null | undefined) =>
    value == null ? null : formatCurrency(value, locale, acquisition?.currency ?? undefined);

  if (!isActive) {
    return (
      <div className="grid gap-4">
        {acquisition ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("inventory.acquisition.previousTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label={t("inventory.fields.acquisitionNumber")}
                  value={acquisition.acquisitionNumber}
                />
                <DetailItem
                  label={t("inventory.fields.acquisitionStatus")}
                  value={t(`acquisitions.status.${acquisition.status}`)}
                />
              </dl>
            </CardContent>
          </Card>
        ) : null}
        <EmptyState
          title={t("inventory.acquisition.emptyTitle")}
          description={t("inventory.acquisition.emptyHint")}
          action={
            <PermissionGate permission="acquisition.create">
              <Link href={`/inventory/${vehicle.id}/edit`} className={cn(buttonVariants())}>
                {t("inventory.actions.addAcquisition")}
              </Link>
            </PermissionGate>
          }
        />
      </div>
    );
  }

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base tracking-tight">
          {t("inventory.sections.acquisition")}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission="vehicle.edit">
            <Link
              href={`/inventory/${vehicle.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("inventory.actions.edit")}
            </Link>
          </PermissionGate>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem
            label={t("inventory.fields.acquisitionNumber")}
            value={acquisition.acquisitionNumber}
          />
          <DetailItem
            label={t("inventory.fields.acquisitionStatus")}
            value={t(`acquisitions.status.${acquisition.status}`)}
          />
          <DetailItem
            label={t("inventory.fields.acquisitionType")}
            value={
              acquisition.sourceType
                ? t(`acquisitions.sourceTypes.${acquisition.sourceType}`)
                : null
            }
          />
          <DetailItem
            label={t("inventory.fields.purchaseDate")}
            value={date(acquisition.purchaseDate)}
          />
          <DetailItem
            label={t("inventory.fields.purchasePrice")}
            value={money(acquisition.purchasePrice)}
          />
          <DetailItem
            label={t("inventory.fields.acquisitionCost")}
            value={
              money(acquisition.totalAcquisitionCost ?? vehicle.totalAcquisitionCost) ??
              (vehicle.totalAcquisitionCost === undefined
                ? t("inventory.placeholders.restricted")
                : null)
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

export function VehicleDetailClient({
  vehicleId,
  initialTab = "overview",
}: {
  vehicleId: string;
  initialTab?: string;
}) {
  const t = useTranslations();
  const query = useVehicle(vehicleId);
  const [statusOpen, setStatusOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const resolvedTab: DetailTab =
    initialTab && DETAIL_TABS.includes(initialTab as DetailTab)
      ? (initialTab as DetailTab)
      : "overview";

  const tabs = useMemo(
    () =>
      [
        { id: "overview" as const, label: t("inventory.tabs.overview"), icon: LayoutDashboardIcon },
        { id: "acquisition" as const, label: t("inventory.tabs.acquisition"), icon: PackageIcon },
        { id: "pricing" as const, label: t("inventory.tabs.pricing"), icon: TagsIcon },
        { id: "photos" as const, label: t("inventory.tabs.photos"), icon: CameraIcon },
        { id: "documents" as const, label: t("inventory.tabs.documents"), icon: FileTextIcon },
        { id: "history" as const, label: t("inventory.tabs.history"), icon: HistoryIcon },
      ] as const,
    [t],
  );

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
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
              <RefreshCwIcon aria-hidden />
              {t("common.retry")}
            </Button>
            <Link href="/inventory" className={buttonVariants()}>
              {t("inventory.actions.back")}
            </Link>
          </div>
        }
      />
    );
  }

  const vehicle = query.data;
  const isArchived = vehicle.status === "archived";
  const canChangeStatus = getGenericStatusChangeOptions(vehicle.status).length > 0;
  const meta = [vehicle.stockNumber, vehicle.vin].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={vehicleTitle(vehicle)}
        description={meta || undefined}
        actions={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <VehicleStatusBadge status={vehicle.status} />
              <MarketTypeBadge value={vehicle.marketType} />
            </div>
            {!isArchived ? (
              <PermissionGate permission="vehicle.edit">
                <Link
                  href={`/inventory/${vehicle.id}/edit`}
                  className={cn(buttonVariants(), "h-10 md:h-9")}
                >
                  <PencilIcon aria-hidden />
                  {t("inventory.actions.edit")}
                </Link>
              </PermissionGate>
            ) : null}
            {canChangeStatus || !isArchived || canArchiveStatus(vehicle.status) ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 md:h-9 md:w-9"
                      aria-label={t("nav.more")}
                    />
                  }
                >
                  <MoreHorizontalIcon aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  {canChangeStatus ? (
                    <PermissionGate permission="vehicle.status.change">
                      <DropdownMenuItem onClick={() => setStatusOpen(true)}>
                        <RefreshCwIcon aria-hidden />
                        {t("inventory.actions.changeStatus")}
                      </DropdownMenuItem>
                    </PermissionGate>
                  ) : null}
                  {!isArchived ? (
                    <PermissionGate permission="vehicle.branch.transfer">
                      <DropdownMenuItem onClick={() => setTransferOpen(true)}>
                        <ArrowLeftRightIcon aria-hidden />
                        {t("inventory.actions.transfer")}
                      </DropdownMenuItem>
                    </PermissionGate>
                  ) : null}
                  {canArchiveStatus(vehicle.status) ? (
                    <PermissionGate permission="vehicle.archive">
                      <DropdownMenuItem variant="destructive" onClick={() => setArchiveOpen(true)}>
                        <ArchiveIcon aria-hidden />
                        {t("inventory.actions.archive")}
                      </DropdownMenuItem>
                    </PermissionGate>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        }
      />

      <Tabs defaultValue={resolvedTab} className="gap-4">
        <div
          className={cn(
            "bg-background/95 supports-backdrop-filter:bg-background/90 sticky z-10 border-b backdrop-blur-md",
            // Cancel #main py-5 / lg:py-8 so the bar sits flush under the app header.
            "-top-5 -mx-4 px-4 py-2 md:-mx-6 md:px-6 lg:-top-8 lg:-mx-8 lg:px-8",
          )}
        >
          <div className="bg-muted/40 overflow-x-auto rounded-2xl border p-1.5">
            <TabsList
              variant="default"
              className="h-auto w-max min-w-full justify-start gap-1 bg-transparent p-0"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "h-10 shrink-0 rounded-xl px-3.5 text-sm font-medium",
                      "data-active:bg-background data-active:text-foreground data-active:shadow-sm",
                      "dark:data-active:bg-background",
                    )}
                  >
                    <Icon data-icon="inline-start" aria-hidden />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="outline-none">
          <div className="grid gap-4">
            <VehicleReadyForSalePanel vehicle={vehicle} />
            <Overview vehicle={vehicle} />
          </div>
        </TabsContent>

        <TabsContent value="acquisition" className="outline-none">
          <AcquisitionPanel vehicle={vehicle} />
        </TabsContent>


        <TabsContent value="pricing" className="outline-none">
          <VehiclePricingPanel vehicleId={vehicle.id} />
        </TabsContent>

        <TabsContent value="photos" className="outline-none">
          <VehicleImageManager mode="manage" vehicleId={vehicle.id} />
        </TabsContent>

        <TabsContent value="documents" className="outline-none">
          <VehicleDocumentsPanel vehicleId={vehicle.id} />
        </TabsContent>

        <TabsContent value="history" className="outline-none">
          <VehicleHistory vehicleId={vehicle.id} />
        </TabsContent>

      </Tabs>

      <VehicleStatusDialog vehicle={vehicle} open={statusOpen} onOpenChange={setStatusOpen} />
      <VehicleTransferDialog vehicle={vehicle} open={transferOpen} onOpenChange={setTransferOpen} />
      <VehicleArchiveDialog vehicle={vehicle} open={archiveOpen} onOpenChange={setArchiveOpen} />
    </div>
  );
}
