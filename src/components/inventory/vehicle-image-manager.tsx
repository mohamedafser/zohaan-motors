"use client";

import {
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImagePlusIcon,
  Loader2Icon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/use-permission";
import {
  useVehiclePhotoMutations,
  useVehiclePhotos,
  vehiclePhotoKeys,
} from "@/hooks/use-vehicle-photos";
import { cn } from "@/lib/utils";
import { buildVehiclePhotoPath, uploadVehiclePhotoFile } from "@/lib/vehicles/photo-upload";
import { validateVehiclePhotoFile } from "@/lib/validation/vehicle-photo";
import {
  VEHICLE_PHOTO_CATEGORIES,
  VEHICLE_PHOTO_FILTER_CATEGORIES,
  VEHICLE_PHOTO_FILTERS,
  type PendingVehiclePhoto,
  type VehiclePhoto,
  type VehiclePhotoCategory,
  type VehiclePhotoFilter,
} from "@/types/vehicle-photo";

function categoryLabel(
  t: ReturnType<typeof useTranslations>,
  category: VehiclePhotoCategory,
) {
  return t(`inventory.photos.categories.${category}`);
}

function defaultCategoryForFilter(filter: VehiclePhotoFilter): VehiclePhotoCategory {
  if (filter === "all") return "front";
  return VEHICLE_PHOTO_FILTER_CATEGORIES[filter][0] ?? "other";
}

function categoryMatchesFilter(
  category: VehiclePhotoCategory,
  filter: VehiclePhotoFilter,
): boolean {
  if (filter === "all") return true;
  return VEHICLE_PHOTO_FILTER_CATEGORIES[filter].includes(category);
}

function ProgressBar({
  value,
  label,
  indeterminate,
  light,
}: {
  value: number;
  label?: string;
  indeterminate?: boolean;
  light?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="grid gap-1">
      {label ? (
        <p className={cn("text-xs", light ? "text-white/90" : "text-muted-foreground")}>{label}</p>
      ) : null}
      <div
        className={cn(
          "h-2 w-full overflow-hidden rounded-full",
          light ? "bg-white/25" : "bg-muted",
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-label={label}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200 ease-out",
            light ? "bg-white" : "bg-primary",
            indeterminate && "w-1/3 animate-pulse",
          )}
          style={indeterminate ? undefined : { width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

type DraftProps = {
  mode: "draft";
  photos: PendingVehiclePhoto[];
  onChange: (photos: PendingVehiclePhoto[]) => void;
  disabled?: boolean;
};

type ManageProps = {
  mode: "manage" | "gallery";
  vehicleId: string;
  readOnly?: boolean;
};

export type VehicleImageManagerProps = DraftProps | ManageProps;

type UploadOverlay = {
  progress: number;
  status: "uploading" | "saving" | "error";
  errorMessage?: string;
};

function PhotoThumb({
  src,
  alt,
  isPrimary,
  onPrimary,
  onRemove,
  onMoveLeft,
  onMoveRight,
  canEdit,
  busy,
  upload,
}: {
  src: string | null;
  alt: string;
  isPrimary: boolean;
  onPrimary?: () => void;
  onRemove?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canEdit: boolean;
  busy?: boolean;
  upload?: UploadOverlay | null;
}) {
  const t = useTranslations();
  const uploading = upload?.status === "uploading" || upload?.status === "saving";
  const failed = upload?.status === "error";

  return (
    <li className="bg-muted/40 relative overflow-hidden rounded-xl border">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed/blob URLs
        <img
          src={src}
          alt={alt}
          className={cn("aspect-square w-full object-cover", uploading && "opacity-80")}
          loading="lazy"
        />
      ) : (
        <div className="bg-muted flex aspect-square items-center justify-center">
          <ImagePlusIcon className="text-muted-foreground size-8" aria-hidden />
        </div>
      )}
      {isPrimary && !upload ? (
        <span className="bg-primary text-primary-foreground absolute start-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium">
          {t("inventory.photos.primary")}
        </span>
      ) : null}
      {upload ? (
        <div className="absolute inset-0 flex flex-col justify-end bg-black/55 p-2.5">
          <div className="mb-auto flex items-center justify-center pt-8">
            {upload.status !== "error" ? (
              <Loader2Icon className="size-7 animate-spin text-white" aria-hidden />
            ) : null}
          </div>
          <ProgressBar
            value={upload.progress}
            indeterminate={upload.status === "saving"}
            light
            label={
              failed
                ? upload.errorMessage || t("inventory.photos.errors.uploadFailed")
                : upload.status === "saving"
                  ? t("inventory.photos.progress.saving")
                  : t("inventory.photos.progress.uploading", {
                      percent: Math.round(upload.progress),
                    })
            }
          />
        </div>
      ) : null}
      {busy && !upload ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2Icon className="size-6 animate-spin text-white" aria-hidden />
        </div>
      ) : null}
      {canEdit && !uploading ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
          {onMoveLeft ? (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label={t("inventory.photos.moveLeft")}
              onClick={onMoveLeft}
            >
              <ChevronLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
            </Button>
          ) : null}
          {onMoveRight ? (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label={t("inventory.photos.moveRight")}
              onClick={onMoveRight}
            >
              <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden />
            </Button>
          ) : null}
          {onPrimary && !isPrimary ? (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label={t("inventory.photos.setPrimary")}
              onClick={onPrimary}
            >
              <StarIcon className="size-4" aria-hidden />
            </Button>
          ) : null}
          {onRemove ? (
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label={t("inventory.photos.remove")}
              onClick={onRemove}
            >
              <Trash2Icon className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function CategorySection({
  category,
  children,
  onAdd,
  onCamera,
  canEdit,
}: {
  category: VehiclePhotoCategory;
  children: React.ReactNode;
  onAdd?: () => void;
  onCamera?: () => void;
  canEdit: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{categoryLabel(t, category)}</h3>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="h-10 sm:h-8" onClick={onAdd}>
              <ImagePlusIcon className="size-4" aria-hidden />
              {t("inventory.photos.add")}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-10 sm:h-8" onClick={onCamera}>
              <CameraIcon className="size-4" aria-hidden />
              {t("inventory.photos.camera")}
            </Button>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function DraftManager({
  photos,
  onChange,
  disabled,
}: {
  photos: PendingVehiclePhoto[];
  onChange: (photos: PendingVehiclePhoto[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pendingCategoryRef = useRef<VehiclePhotoCategory>("front");

  function openPicker(category: VehiclePhotoCategory, mode: "file" | "camera") {
    pendingCategoryRef.current = category;
    if (mode === "file") fileRef.current?.click();
    else cameraRef.current?.click();
  }

  function addFiles(files: FileList | null, category: VehiclePhotoCategory) {
    if (!files || files.length === 0) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      const errorKey = validateVehiclePhotoFile(file);
      if (errorKey) {
        toast.error(t(errorKey));
        continue;
      }
      next.push({
        localId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        category,
        isPrimary: next.length === 0,
        status: "ready",
      });
    }
    // Ensure one primary: prefer first front, else first photo.
    const withPrimary = next.map((photo) => ({ ...photo, isPrimary: false }));
    const front = withPrimary.find((photo) => photo.category === "front");
    const primary = front ?? withPrimary[0];
    if (primary) primary.isPrimary = true;
    onChange(withPrimary);
  }

  function remove(localId: string) {
    const next = photos.filter((photo) => {
      if (photo.localId !== localId) return true;
      if (photo.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
      return false;
    });
    if (next.length > 0 && !next.some((photo) => photo.isPrimary)) {
      const front = next.find((photo) => photo.category === "front");
      (front ?? next[0]!).isPrimary = true;
    }
    onChange(next);
  }

  function setPrimary(localId: string) {
    onChange(photos.map((photo) => ({ ...photo, isPrimary: photo.localId === localId })));
  }

  function move(localId: string, direction: -1 | 1) {
    const index = photos.findIndex((photo) => photo.localId === localId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onChange(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("inventory.photos.title")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("inventory.photos.hint")}</p>
      </CardHeader>
      <CardContent className="grid gap-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files, pendingCategoryRef.current);
            event.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files, pendingCategoryRef.current);
            event.target.value = "";
          }}
        />

        {VEHICLE_PHOTO_CATEGORIES.map((category) => {
          const items = photos.filter((photo) => photo.category === category);
          return (
            <CategorySection
              key={category}
              category={category}
              canEdit={!disabled}
              onAdd={() => openPicker(category, "file")}
              onCamera={() => openPicker(category, "camera")}
            >
              {items.length === 0 ? (
                <p className="text-muted-foreground text-xs">{t("inventory.photos.emptyCategory")}</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((photo) => {
                    const globalIndex = photos.findIndex((p) => p.localId === photo.localId);
                    const upload =
                      photo.status === "uploading" ||
                      photo.status === "saving" ||
                      photo.status === "error"
                        ? {
                            progress: photo.progress ?? 0,
                            status: photo.status,
                            errorMessage: photo.errorMessage,
                          }
                        : null;
                    return (
                      <PhotoThumb
                        key={photo.localId}
                        src={photo.previewUrl}
                        alt={photo.file.name}
                        isPrimary={photo.isPrimary}
                        canEdit={!disabled && photo.status !== "uploading" && photo.status !== "saving"}
                        upload={upload}
                        onPrimary={() => setPrimary(photo.localId)}
                        onRemove={() => remove(photo.localId)}
                        onMoveLeft={globalIndex > 0 ? () => move(photo.localId, -1) : undefined}
                        onMoveRight={
                          globalIndex < photos.length - 1
                            ? () => move(photo.localId, 1)
                            : undefined
                        }
                      />
                    );
                  })}
                </ul>
              )}
            </CategorySection>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ManageManager({
  vehicleId,
  readOnly,
}: {
  vehicleId: string;
  readOnly?: boolean;
}) {
  const t = useTranslations();
  const { can } = usePermission();
  const canEdit =
    !readOnly && (can("vehicle.edit") || can("vehicle.create"));
  const query = useVehiclePhotos(vehicleId);
  const { add, update, remove, reorder } = useVehiclePhotoMutations(vehicleId);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pendingCategoryRef = useRef<VehiclePhotoCategory>("front");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<VehiclePhotoFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<
    Array<{
      localId: string;
      previewUrl: string;
      fileName: string;
      category: VehiclePhotoCategory;
      progress: number;
      status: "uploading" | "saving" | "error";
      errorMessage?: string;
    }>
  >([]);

  useEffect(() => {
    pendingCategoryRef.current = defaultCategoryForFilter(filter);
  }, [filter]);

  function setFilterAndCategory(next: VehiclePhotoFilter) {
    setFilter(next);
    pendingCategoryRef.current = defaultCategoryForFilter(next);
  }

  function openPicker(category: VehiclePhotoCategory, mode: "file" | "camera") {
    pendingCategoryRef.current = category;
    if (mode === "file") fileRef.current?.click();
    else cameraRef.current?.click();
  }

  function openPickerForActiveFilter(mode: "file" | "camera") {
    openPicker(defaultCategoryForFilter(filter), mode);
  }

  async function uploadFiles(files: FileList | null, category: VehiclePhotoCategory) {
    if (!files || files.length === 0) return;
    setUploading(true);

    const queue = Array.from(files).flatMap((file) => {
      const errorKey = validateVehiclePhotoFile(file);
      if (errorKey) {
        toast.error(t(errorKey));
        return [];
      }
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      return [{ file, localId, previewUrl }];
    });

    if (queue.length === 0) {
      setUploading(false);
      return;
    }

    setPendingUploads((current) => [
      ...current,
      ...queue.map(({ file, localId, previewUrl }) => ({
        localId,
        previewUrl,
        fileName: file.name,
        category,
        progress: 0,
        status: "uploading" as const,
      })),
    ]);

    let success = 0;
    try {
      for (const item of queue) {
        const path = buildVehiclePhotoPath(vehicleId, category, item.file.name);
        try {
          await uploadVehiclePhotoFile(item.file, path, (percent) => {
            setPendingUploads((current) =>
              current.map((pending) =>
                pending.localId === item.localId
                  ? { ...pending, progress: percent, status: "uploading" }
                  : pending,
              ),
            );
          });

          setPendingUploads((current) =>
            current.map((pending) =>
              pending.localId === item.localId
                ? { ...pending, progress: 95, status: "saving" }
                : pending,
            ),
          );

          const saved = await add.mutateAsync({
            storagePath: path,
            category,
            fileName: item.file.name,
            mimeType: item.file.type || null,
            fileSize: item.file.size,
            isPrimary: false,
          });

          // Show under the category immediately (before refetch settles).
          queryClient.setQueryData<VehiclePhoto[]>(
            vehiclePhotoKeys.all(vehicleId),
            (current) => {
              const list = current ?? [];
              if (list.some((photo) => photo.id === saved.id)) return list;
              return [...list, saved].sort((a, b) => a.sortOrder - b.sortOrder);
            },
          );

          success += 1;
          setPendingUploads((current) =>
            current.filter((pending) => {
              if (pending.localId !== item.localId) return true;
              if (pending.previewUrl.startsWith("blob:")) URL.revokeObjectURL(pending.previewUrl);
              return false;
            }),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : t("inventory.photos.errors.uploadFailed");
          setPendingUploads((current) =>
            current.map((pending) =>
              pending.localId === item.localId
                ? {
                    ...pending,
                    status: "error",
                    errorMessage: message,
                    progress: pending.progress,
                  }
                : pending,
            ),
          );
          toast.error(message);
        }
      }
      if (success > 0) {
        toast.success(
          success === 1
            ? t("inventory.photos.toasts.uploaded")
            : t("inventory.photos.toasts.uploadedMany", { count: success }),
        );
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function dismissFailedUpload(localId: string) {
    setPendingUploads((current) =>
      current.filter((pending) => {
        if (pending.localId !== localId) return true;
        if (pending.previewUrl.startsWith("blob:")) URL.revokeObjectURL(pending.previewUrl);
        return false;
      }),
    );
  }

  async function setPrimary(photoId: string) {
    setBusyId(photoId);
    try {
      await update.mutateAsync({ photoId, body: { isPrimary: true } });
      toast.success(t("inventory.photos.toasts.primarySet"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inventory.photos.errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(photoId: string) {
    setBusyId(photoId);
    try {
      await remove.mutateAsync(photoId);
      toast.success(t("inventory.photos.toasts.removed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inventory.photos.errors.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function move(photoId: string, direction: -1 | 1) {
    if (!query.data) return;
    const ordered = [...query.data].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((photo) => photo.id === photoId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    setBusyId(photoId);
    try {
      await reorder.mutateAsync({ orderedIds: next.map((photo) => photo.id) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inventory.photos.errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (query.isError) {
    return (
      <EmptyState
        title={t("inventory.photos.errors.loadFailed")}
        description={t("inventory.photos.errors.generic")}
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const photos = query.data ?? [];
  const visible =
    filter === "all"
      ? photos
      : photos.filter((photo) =>
          VEHICLE_PHOTO_FILTER_CATEGORIES[filter].includes(photo.category),
        );

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>{t("inventory.photos.title")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_PHOTO_FILTERS.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={filter === item ? "default" : "outline"}
              onClick={() => setFilterAndCategory(item)}
            >
              {t(`inventory.photos.filters.${item}`)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            void uploadFiles(event.target.files, pendingCategoryRef.current);
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            void uploadFiles(event.target.files, pendingCategoryRef.current);
          }}
        />

        {canEdit ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="h-11 sm:h-9"
                disabled={uploading}
                onClick={() => openPickerForActiveFilter("file")}
              >
                {uploading ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
                {t("inventory.photos.add")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 sm:h-9"
                disabled={uploading}
                onClick={() => openPickerForActiveFilter("camera")}
              >
                <CameraIcon className="size-4" aria-hidden />
                {t("inventory.photos.camera")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("inventory.photos.uploadToCategory", {
                category: categoryLabel(t, defaultCategoryForFilter(filter)),
              })}
            </p>
          </div>
        ) : null}

        {pendingUploads.length > 0 ? (
          <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
            <p className="text-sm font-medium">{t("inventory.photos.progress.title")}</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {pendingUploads.map((photo) => (
                <PhotoThumb
                  key={photo.localId}
                  src={photo.previewUrl}
                  alt={photo.fileName}
                  isPrimary={false}
                  canEdit={photo.status === "error"}
                  upload={{
                    progress: photo.progress,
                    status: photo.status,
                    errorMessage: photo.errorMessage,
                  }}
                  onRemove={
                    photo.status === "error"
                      ? () => dismissFailedUpload(photo.localId)
                      : undefined
                  }
                />
              ))}
            </ul>
          </div>
        ) : null}

        {photos.length === 0 && pendingUploads.length === 0 ? (
          <EmptyState
            icon={CameraIcon}
            title={t("inventory.photos.emptyTitle")}
            description={t("inventory.photos.emptyHint")}
          />
        ) : (
          VEHICLE_PHOTO_CATEGORIES.filter((category) =>
            categoryMatchesFilter(category, filter),
          ).map((category) => {
            const items = visible.filter((photo) => photo.category === category);
            // Pending already shown in the top progress strip — avoid duplicates here.
            if (filter !== "all" && items.length === 0) return null;
            if (filter === "all" && items.length === 0) {
              return (
                <CategorySection
                  key={category}
                  category={category}
                  canEdit={canEdit}
                  onAdd={() => openPicker(category, "file")}
                  onCamera={() => openPicker(category, "camera")}
                >
                  <p className="text-muted-foreground text-xs">
                    {t("inventory.photos.emptyCategory")}
                  </p>
                </CategorySection>
              );
            }
            if (items.length === 0) return null;
            return (
              <CategorySection
                key={category}
                category={category}
                canEdit={canEdit}
                onAdd={() => openPicker(category, "file")}
                onCamera={() => openPicker(category, "camera")}
              >
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((photo: VehiclePhoto) => {
                    const globalIndex = photos.findIndex((p) => p.id === photo.id);
                    return (
                      <PhotoThumb
                        key={photo.id}
                        src={photo.url}
                        alt={photo.fileName}
                        isPrimary={photo.isPrimary}
                        canEdit={canEdit}
                        busy={busyId === photo.id}
                        onPrimary={() => void setPrimary(photo.id)}
                        onRemove={() => void handleRemove(photo.id)}
                        onMoveLeft={
                          globalIndex > 0 ? () => void move(photo.id, -1) : undefined
                        }
                        onMoveRight={
                          globalIndex < photos.length - 1
                            ? () => void move(photo.id, 1)
                            : undefined
                        }
                      />
                    );
                  })}
                </ul>
              </CategorySection>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function VehicleImageManager(props: VehicleImageManagerProps) {
  if (props.mode === "draft") {
    return (
      <DraftManager
        photos={props.photos}
        onChange={props.onChange}
        disabled={props.disabled}
      />
    );
  }
  return <ManageManager vehicleId={props.vehicleId} readOnly={props.readOnly || props.mode === "gallery"} />;
}

/** Upload draft photos after vehicle creation. Returns failed pending items. */
export async function uploadPendingVehiclePhotos(
  vehicleId: string,
  photos: PendingVehiclePhoto[],
  addPhoto: (body: {
    storagePath: string;
    category: VehiclePhotoCategory;
    fileName: string;
    mimeType: string | null;
    fileSize: number;
    isPrimary: boolean;
  }) => Promise<unknown>,
  onProgress?: (
    localId: string,
    progress: number,
    status: PendingVehiclePhoto["status"],
    errorMessage?: string,
  ) => void,
): Promise<PendingVehiclePhoto[]> {
  const failed: PendingVehiclePhoto[] = [];
  // Prefer explicit primary, else first front, else first.
  const primaryId =
    photos.find((photo) => photo.isPrimary)?.localId ??
    photos.find((photo) => photo.category === "front")?.localId ??
    photos[0]?.localId;

  for (const photo of photos) {
    const path = buildVehiclePhotoPath(vehicleId, photo.category, photo.file.name);
    try {
      onProgress?.(photo.localId, 0, "uploading");
      await uploadVehiclePhotoFile(photo.file, path, (percent) => {
        onProgress?.(photo.localId, percent, "uploading");
      });
      onProgress?.(photo.localId, 95, "saving");
      await addPhoto({
        storagePath: path,
        category: photo.category,
        fileName: photo.file.name,
        mimeType: photo.file.type || null,
        fileSize: photo.file.size,
        isPrimary: photo.localId === primaryId,
      });
      onProgress?.(photo.localId, 100, "ready");
      if (photo.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      failed.push({
        ...photo,
        status: "error",
        errorMessage: message,
        progress: photo.progress ?? 0,
      });
      onProgress?.(photo.localId, photo.progress ?? 0, "error", message);
    }
  }
  return failed;
}

export function useRevokePendingPhotos(photos: PendingVehiclePhoto[]) {
  useEffect(() => {
    return () => {
      for (const photo of photos) {
        if (photo.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on unmount
  }, []);
}
