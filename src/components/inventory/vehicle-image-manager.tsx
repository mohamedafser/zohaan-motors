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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { VehiclePhotoLightbox } from "@/components/inventory/vehicle-photo-lightbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoManagerSkeleton } from "@/components/feedback/skeletons";
import { usePermission } from "@/hooks/use-permission";
import {
  useVehiclePhotoMutations,
  useVehiclePhotos,
  vehiclePhotoKeys,
} from "@/hooks/use-vehicle-photos";
import { cn } from "@/lib/utils";
import { buildVehiclePhotoPath, uploadVehiclePhotoFile } from "@/lib/vehicles/photo-upload";
import { validateVehiclePhotoFile } from "@/lib/validation/vehicle-photo";
import type { PendingVehiclePhoto, VehiclePhoto } from "@/types/vehicle-photo";

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

type UploadOverlay = {
  progress: number;
  status: "uploading" | "saving" | "error";
  errorMessage?: string;
};

function PhotoThumb({
  src,
  alt,
  isPrimary,
  featured = false,
  onOpen,
  onPrimary,
  onRemove,
  onMoveLeft,
  onMoveRight,
  canEdit,
  busy,
  upload,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  src: string | null;
  alt: string;
  isPrimary: boolean;
  featured?: boolean;
  onOpen?: () => void;
  onPrimary?: () => void;
  onRemove?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canEdit: boolean;
  busy?: boolean;
  upload?: UploadOverlay | null;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: () => void;
}) {
  const t = useTranslations();
  const uploading = upload?.status === "uploading" || upload?.status === "saving";
  const failed = upload?.status === "error";

  return (
    <li
      className={cn(
        "bg-muted/20 group relative overflow-hidden rounded-2xl ring-1 ring-foreground/8 transition-all duration-200",
        onOpen && "hover:ring-foreground/20 hover:shadow-md",
        featured ? "h-full min-h-48 w-full" : "w-full",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        className={cn(
          "focus-visible:ring-ring relative block w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          featured ? "h-full min-h-48" : "aspect-square",
        )}
        onClick={onOpen}
        disabled={!onOpen || uploading}
        aria-label={alt}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed/blob URLs
          <img
            src={src}
            alt={alt}
            className={cn(
              "absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
              uploading && "opacity-80",
            )}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="bg-muted absolute inset-0 flex items-center justify-center">
            <ImagePlusIcon className="text-muted-foreground size-8" aria-hidden />
          </div>
        )}
        <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-60 transition-opacity duration-200 group-hover:opacity-100" />
      </button>

      {isPrimary && !upload ? (
        <span className="absolute inset-s-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <StarIcon className="size-3 fill-current" aria-hidden />
          {t("inventory.photos.primary")}
        </span>
      ) : null}

      {upload ? (
        <div className="absolute inset-0 flex flex-col justify-end bg-black/55 p-3">
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
        <div
          className="absolute inset-e-2 bottom-2 flex items-center gap-1 rounded-full bg-black/50 p-1 opacity-100 backdrop-blur-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          data-row-stop
          onClick={(event) => event.stopPropagation()}
        >
          {onMoveLeft ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-8 text-white hover:bg-white/15 hover:text-white"
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
              variant="ghost"
              className="size-8 text-white hover:bg-white/15 hover:text-white"
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
              variant="ghost"
              className="size-8 text-white hover:bg-white/15 hover:text-white"
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
              variant="ghost"
              className="size-8 text-white hover:bg-rose-500/80 hover:text-white"
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

function GalleryToolbar({
  canEdit,
  uploading,
  onAdd,
  onCamera,
  dropActive,
  empty,
}: {
  canEdit: boolean;
  uploading?: boolean;
  onAdd: () => void;
  onCamera: () => void;
  dropActive?: boolean;
  empty?: boolean;
}) {
  const t = useTranslations();
  if (!canEdit) return null;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed transition-colors",
        dropActive
          ? "border-primary bg-primary/8"
          : "border-border/80 bg-muted/20 hover:border-foreground/20 hover:bg-muted/30",
        empty ? "px-4 py-10 sm:py-14" : "px-4 py-4",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-start",
          !empty && "sm:justify-between",
        )}
      >
        <div className="grid gap-1">
          <p className="text-sm font-medium tracking-tight">
            {empty ? t("inventory.photos.emptyTitle") : t("inventory.photos.add")}
          </p>
          <p className="text-muted-foreground text-xs">
            {empty ? t("inventory.photos.emptyHint") : t("inventory.photos.dropHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            className="h-10 rounded-full px-4"
            disabled={uploading}
            onClick={onAdd}
          >
            {uploading ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlusIcon className="size-4" aria-hidden />
            )}
            {t("inventory.photos.add")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full px-4"
            disabled={uploading}
            onClick={onCamera}
          >
            <CameraIcon className="size-4" aria-hidden />
            {t("inventory.photos.camera")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const GALLERY_GRID = "grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3";
const SIDE_GRID = "grid grid-cols-2 gap-2 sm:gap-3";

function PhotoGalleryList<T extends { isPrimary: boolean }>({
  photos,
  renderThumb,
}: {
  photos: T[];
  renderThumb: (photo: T, index: number, featured: boolean) => ReactNode;
}) {
  if (photos.length === 0) return null;

  const featuredIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.isPrimary),
  );
  const featuredPhoto = photos[featuredIndex]!;
  const others = photos
    .map((photo, index) => ({ photo, index }))
    .filter(({ index }) => index !== featuredIndex);
  const side = others.slice(0, 4);
  const below = others.slice(4);

  if (others.length === 0) {
    return <ul className="grid">{renderThumb(featuredPhoto, featuredIndex, true)}</ul>;
  }

  return (
    <div className="grid gap-2 sm:gap-3">
      <div className="grid gap-2 sm:grid-cols-2 sm:items-stretch sm:gap-3">
        <ul className="grid min-h-48">{renderThumb(featuredPhoto, featuredIndex, true)}</ul>
        <ul className={SIDE_GRID}>
          {side.map(({ photo, index }) => renderThumb(photo, index, false))}
        </ul>
      </div>
      {below.length > 0 ? (
        <ul className={GALLERY_GRID}>
          {below.map(({ photo, index }) => renderThumb(photo, index, false))}
        </ul>
      ) : null}
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
  const [dropActive, setDropActive] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const dragId = useRef<string | null>(null);

  function ensurePrimary(list: PendingVehiclePhoto[]) {
    if (list.length === 0) return list;
    if (list.some((photo) => photo.isPrimary)) return list;
    return list.map((photo, index) => ({ ...photo, isPrimary: index === 0 }));
  }

  function addFiles(files: FileList | File[] | null) {
    if (!files || (files as FileList).length === 0) return;
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
        category: "other",
        isPrimary: next.length === 0,
        status: "ready",
      });
    }
    onChange(ensurePrimary(next));
  }

  function remove(localId: string) {
    const next = photos.filter((photo) => {
      if (photo.localId !== localId) return true;
      if (photo.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
      return false;
    });
    onChange(ensurePrimary(next));
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

  function dropOn(targetId: string) {
    const fromId = dragId.current;
    if (!fromId || fromId === targetId) return;
    const next = [...photos];
    const from = next.findIndex((photo) => photo.localId === fromId);
    const to = next.findIndex((photo) => photo.localId === targetId);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
    dragId.current = null;
  }

  const lightboxPhotos = photos.map((photo) => ({
    id: photo.localId,
    src: photo.previewUrl,
    alt: photo.file.name,
    caption: photo.file.name,
  }));

  return (
    <Card
      className="border-border/70 shadow-none"
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDropActive(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
        <div className="grid gap-1">
          <CardTitle className="text-base tracking-tight">{t("inventory.photos.title")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("inventory.photos.hint")}</p>
        </div>
        {photos.length > 0 ? (
          <span className="text-muted-foreground rounded-full bg-muted px-2.5 py-1 text-xs tabular-nums">
            {photos.length}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
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
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <GalleryToolbar
          canEdit={!disabled}
          onAdd={() => fileRef.current?.click()}
          onCamera={() => cameraRef.current?.click()}
          dropActive={dropActive}
          empty={photos.length === 0}
        />

        <PhotoGalleryList
          photos={photos}
          renderThumb={(photo, index, featured) => (
            <PhotoThumb
              key={photo.localId}
              src={photo.previewUrl}
              alt={photo.file.name}
              isPrimary={photo.isPrimary}
              featured={featured}
              canEdit={!disabled}
              onOpen={() => setLightboxIndex(index)}
              onPrimary={() => setPrimary(photo.localId)}
              onRemove={() => remove(photo.localId)}
              onMoveLeft={index > 0 ? () => move(photo.localId, -1) : undefined}
              onMoveRight={
                index < photos.length - 1 ? () => move(photo.localId, 1) : undefined
              }
              draggable={!disabled}
              onDragStart={() => {
                dragId.current = photo.localId;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOn(photo.localId)}
            />
          )}
        />

        <VehiclePhotoLightbox
          photos={lightboxPhotos}
          index={lightboxIndex ?? 0}
          open={lightboxIndex != null}
          onOpenChange={(open) => {
            if (!open) setLightboxIndex(null);
          }}
          onIndexChange={setLightboxIndex}
        />
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
  // Managing photos of a saved car is editing it; create-only roles add photos in the create flow.
  const canEdit = !readOnly && can("vehicle.edit");
  const query = useVehiclePhotos(vehicleId);
  const { add, update, remove, reorder } = useVehiclePhotoMutations(vehicleId);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const dragId = useRef<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<
    Array<{
      localId: string;
      previewUrl: string;
      fileName: string;
      progress: number;
      status: "uploading" | "saving" | "error";
      errorMessage?: string;
    }>
  >([]);

  async function uploadFiles(files: FileList | File[] | null) {
    if (!files || (files as FileList).length === 0) return;
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
        progress: 0,
        status: "uploading" as const,
      })),
    ]);

    let success = 0;
    try {
      for (const item of queue) {
        const path = buildVehiclePhotoPath(vehicleId, item.file.name);
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
            category: "other",
            fileName: item.file.name,
            mimeType: item.file.type || null,
            fileSize: item.file.size,
            isPrimary: false,
          });

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
    const confirmed = window.confirm(t("inventory.photos.confirmDelete"));
    if (!confirmed) return;
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

  async function dropOn(targetId: string) {
    if (!query.data) return;
    const fromId = dragId.current;
    if (!fromId || fromId === targetId) return;
    const ordered = [...query.data].sort((a, b) => a.sortOrder - b.sortOrder);
    const from = ordered.findIndex((photo) => photo.id === fromId);
    const to = ordered.findIndex((photo) => photo.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...ordered];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    dragId.current = null;
    setBusyId(fromId);
    try {
      await reorder.mutateAsync({ orderedIds: next.map((photo) => photo.id) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inventory.photos.errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  if (query.isPending) return <PhotoManagerSkeleton />;
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

  const photos = [...(query.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const lightboxPhotos = photos.map((photo) => ({
    id: photo.id,
    src: photo.url,
    alt: photo.fileName,
    caption: photo.fileName,
  }));
  const isEmpty = photos.length === 0 && pendingUploads.length === 0;

  return (
    <Card
      className="border-border/70 shadow-none"
      onDragOver={(event) => {
        if (!canEdit) return;
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(event) => {
        if (!canEdit) return;
        if (event.dataTransfer.files.length === 0) return;
        event.preventDefault();
        setDropActive(false);
        void uploadFiles(event.dataTransfer.files);
      }}
    >
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
        <div className="grid gap-1">
          <CardTitle className="text-base tracking-tight">{t("inventory.photos.title")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("inventory.photos.hint")}</p>
        </div>
        {photos.length > 0 ? (
          <span className="text-muted-foreground rounded-full bg-muted px-2.5 py-1 text-xs tabular-nums">
            {photos.length}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            void uploadFiles(event.target.files);
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            void uploadFiles(event.target.files);
          }}
        />

        <GalleryToolbar
          canEdit={canEdit}
          uploading={uploading}
          onAdd={() => fileRef.current?.click()}
          onCamera={() => cameraRef.current?.click()}
          dropActive={dropActive}
          empty={isEmpty}
        />

        {!canEdit && isEmpty ? (
          <EmptyState
            icon={CameraIcon}
            title={t("inventory.photos.emptyTitle")}
            description={t("inventory.photos.emptyHint")}
          />
        ) : null}

        {pendingUploads.length > 0 ? (
          <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
            <p className="text-sm font-medium tracking-tight">
              {t("inventory.photos.progress.title")}
            </p>
            <ul className={GALLERY_GRID}>
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

        <PhotoGalleryList
          photos={photos}
          renderThumb={(photo, index, featured) => (
            <PhotoThumb
              key={photo.id}
              src={photo.url}
              alt={photo.fileName}
              isPrimary={photo.isPrimary}
              featured={featured}
              canEdit={canEdit}
              busy={busyId === photo.id}
              onOpen={() => setLightboxIndex(index)}
              onPrimary={() => void setPrimary(photo.id)}
              onRemove={() => void handleRemove(photo.id)}
              onMoveLeft={index > 0 ? () => void move(photo.id, -1) : undefined}
              onMoveRight={
                index < photos.length - 1 ? () => void move(photo.id, 1) : undefined
              }
              draggable={canEdit}
              onDragStart={() => {
                dragId.current = photo.id;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void dropOn(photo.id)}
            />
          )}
        />

        <VehiclePhotoLightbox
          photos={lightboxPhotos}
          index={lightboxIndex ?? 0}
          open={lightboxIndex != null}
          onOpenChange={(open) => {
            if (!open) setLightboxIndex(null);
          }}
          onIndexChange={setLightboxIndex}
        />
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
  return (
    <ManageManager
      vehicleId={props.vehicleId}
      readOnly={props.readOnly || props.mode === "gallery"}
    />
  );
}

/** Upload draft photos after vehicle creation. Returns failed pending items. */
export async function uploadPendingVehiclePhotos(
  vehicleId: string,
  photos: PendingVehiclePhoto[],
  addPhoto: (body: {
    storagePath: string;
    category: PendingVehiclePhoto["category"];
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
  const primaryId =
    photos.find((photo) => photo.isPrimary)?.localId ?? photos[0]?.localId;

  for (const photo of photos) {
    const path = buildVehiclePhotoPath(vehicleId, photo.file.name);
    try {
      onProgress?.(photo.localId, 0, "uploading");
      await uploadVehiclePhotoFile(photo.file, path, (percent) => {
        onProgress?.(photo.localId, percent, "uploading");
      });
      onProgress?.(photo.localId, 95, "saving");
      await addPhoto({
        storagePath: path,
        category: photo.category || "other",
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
