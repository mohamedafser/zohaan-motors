"use client";

import { Loader2Icon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InspectionPhoto, InspectionPhotoCategory } from "@/types/inspection";

export type PendingInspectionUpload = {
  localId: string;
  previewUrl: string;
  fileName: string;
  category: InspectionPhotoCategory;
  progress: number;
  status: "uploading" | "saving" | "error";
  errorMessage?: string;
};

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

export function InspectionPhotosGrid({
  photos,
  pending = [],
  canRemove = false,
  removingId = null,
  onRemove,
  onDismissPending,
  className,
}: {
  photos: InspectionPhoto[];
  pending?: PendingInspectionUpload[];
  canRemove?: boolean;
  removingId?: string | null;
  onRemove?: (photoId: string) => void | Promise<void>;
  onDismissPending?: (localId: string) => void;
  className?: string;
}) {
  const t = useTranslations();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRemove(photoId: string) {
    if (!onRemove) return;
    setBusyId(photoId);
    try {
      await onRemove(photoId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    } finally {
      setBusyId(null);
    }
  }

  if (photos.length === 0 && pending.length === 0) {
    return (
      <EmptyState
        icon={UploadCloudIcon}
        title={t("inspections.empty.photosTitle")}
        description={t("inspections.empty.photosHint")}
        className="border-0 py-8"
      />
    );
  }

  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {pending.map((item) => (
        <li
          key={item.localId}
          className="bg-muted/40 relative overflow-hidden rounded-xl border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img
            src={item.previewUrl}
            alt={item.fileName}
            className="aspect-square w-full object-cover opacity-80"
          />
          <div className="absolute inset-x-0 bottom-0 grid gap-1.5 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-8 text-white">
            <p className="truncate text-xs font-medium">
              {t(`inspections.photoCategories.${item.category}`)}
            </p>
            <ProgressBar
              value={item.progress}
              indeterminate={item.status === "saving"}
              light
              label={
                item.status === "error"
                  ? item.errorMessage || t("inspections.perform.uploadFailed")
                  : item.status === "saving"
                    ? t("inspections.perform.savingPhoto")
                    : t("inspections.perform.uploadingPercent", {
                        percent: Math.round(item.progress),
                      })
              }
            />
          </div>
          {item.status === "uploading" || item.status === "saving" ? (
            <div className="absolute start-2 top-2 rounded-full bg-black/55 p-1.5 text-white">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            </div>
          ) : null}
          {item.status === "error" && onDismissPending ? (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="absolute end-2 top-2 shadow-sm"
              aria-label={t("inspections.perform.dismissFailedUpload")}
              onClick={() => onDismissPending(item.localId)}
            >
              <Trash2Icon aria-hidden />
            </Button>
          ) : null}
        </li>
      ))}

      {photos.map((photo) => {
        const isRemoving = busyId === photo.id || removingId === photo.id;
        return (
          <li key={photo.id} className="bg-muted/40 group relative overflow-hidden rounded-xl border">
            {photo.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs
              <img
                src={photo.signedUrl}
                alt={photo.caption || t(`inspections.photoCategories.${photo.category}`)}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex aspect-square items-center justify-center text-xs">
                {t("inspections.detail.photoUnavailable")}
              </div>
            )}
            <div className="grid gap-0.5 p-2">
              <p className="text-xs font-medium">
                {t(`inspections.photoCategories.${photo.category}`)}
              </p>
              {photo.caption ? (
                <p className="text-muted-foreground line-clamp-2 text-xs">{photo.caption}</p>
              ) : null}
            </div>
            {canRemove && onRemove ? (
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                className="absolute end-2 top-2 shadow-sm"
                disabled={isRemoving}
                aria-label={t("inspections.perform.removePhoto")}
                onClick={() => void handleRemove(photo.id)}
              >
                {isRemoving ? (
                  <Loader2Icon className="animate-spin" aria-hidden />
                ) : (
                  <Trash2Icon aria-hidden />
                )}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
