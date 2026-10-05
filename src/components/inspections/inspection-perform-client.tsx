"use client";

import {
  AlertTriangleIcon,
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudOffIcon,
  ImageIcon,
  MinusIcon,
  PlusIcon,
  WifiIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";

import { InspectionFindingDialog } from "@/components/inspections/inspection-finding-dialog";
import { InspectionFindingsList } from "@/components/inspections/inspection-findings-list";
import {
  InspectionPhotosGrid,
  type PendingInspectionUpload,
} from "@/components/inspections/inspection-photos-grid";
import { InspectionProgressBar } from "@/components/inspections/inspection-progress";
import { InspectionSubmitDialog } from "@/components/inspections/inspection-submit-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/use-permission";
import { useInspection, useInspectionMutations } from "@/hooks/use-inspections";
import {
  canEditInspectionChecklist,
  canSubmitInspection,
} from "@/lib/inspections/status-transitions";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import type { SaveInspectionDraftValues } from "@/lib/validation/inspection";
import type {
  InspectionFinding,
  InspectionItem,
  InspectionItemResult,
  InspectionPhotoCategory,
  InspectionSeverity,
} from "@/types/inspection";
import {
  INSPECTION_PHOTO_CATEGORIES,
  INSPECTION_SECTION_KEYS,
  INSPECTION_SEVERITIES,
} from "@/types/inspection";

type ItemDraft = {
  id: string;
  result: InspectionItemResult | null;
  severity: InspectionSeverity | null;
  notes: string | null;
};

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const DRAFT_KEY = (id: string) => `inspection-draft:${id}`;
const RESULT_BUTTONS: {
  result: InspectionItemResult;
  icon: typeof CheckIcon;
  className: string;
}[] = [
  {
    result: "pass",
    icon: CheckIcon,
    className:
      "border-emerald-600/40 bg-emerald-600/10 text-emerald-900 data-[active=true]:bg-emerald-600 data-[active=true]:text-white dark:text-emerald-100",
  },
  {
    result: "fail",
    icon: XIcon,
    className:
      "border-rose-600/40 bg-rose-600/10 text-rose-900 data-[active=true]:bg-rose-600 data-[active=true]:text-white dark:text-rose-100",
  },
  {
    result: "advisory",
    icon: AlertTriangleIcon,
    className:
      "border-amber-600/40 bg-amber-600/10 text-amber-950 data-[active=true]:bg-amber-600 data-[active=true]:text-white dark:text-amber-100",
  },
  {
    result: "not_applicable",
    icon: MinusIcon,
    className:
      "border-stone-500/40 bg-stone-500/10 text-stone-900 data-[active=true]:bg-stone-600 data-[active=true]:text-white dark:text-stone-100",
  },
  {
    result: "not_tested",
    icon: PlusIcon,
    className:
      "border-sky-600/40 bg-sky-600/10 text-sky-950 data-[active=true]:bg-sky-600 data-[active=true]:text-white dark:text-sky-100",
  },
];

function needsSeverity(result: InspectionItemResult | null) {
  return result === "fail" || result === "advisory";
}

function odometerMismatch(reading: number | null, vehicleMileage: number | null) {
  if (reading == null || vehicleMileage == null || vehicleMileage <= 0) return false;
  const delta = Math.abs(reading - vehicleMileage);
  return delta > 5000 || delta / vehicleMileage > 0.1;
}

function sectionLabel(
  t: ReturnType<typeof useTranslations>,
  sectionKey: string,
  fallback: string,
) {
  if ((INSPECTION_SECTION_KEYS as readonly string[]).includes(sectionKey)) {
    return t(`inspections.sections.${sectionKey}`);
  }
  return fallback;
}

function buildItemMap(items: InspectionItem[]): Record<string, ItemDraft> {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        id: item.id,
        result: item.result,
        severity: item.severity,
        notes: item.notes,
      },
    ]),
  );
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "photo.jpg";
}

async function uploadInspectionFileWithProgress(
  file: File,
  path: string,
  onProgress: (percent: number) => void,
) {
  const supabase = createClient();
  const { url, key } = requireSupabaseEnv();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Authentication required.");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${url}/storage/v1/object/inspection-photos/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      // Reserve the last 10% for metadata save.
      onProgress(Math.round((event.loaded / event.total) * 90));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(90);
        resolve();
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = body.message || body.error || message;
      } catch {
        // keep default
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(file);
  });
}

type LocalDraft = {
  items?: Record<string, ItemDraft>;
  odometerReading?: string;
  verifiedVin?: string;
  vinVerified?: boolean;
  notes?: string;
};

function readLocalDraft(inspectionId: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(inspectionId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalDraft;
  } catch {
    return null;
  }
}

export function InspectionPerformClient({ inspectionId }: { inspectionId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { can } = usePermission();
  const query = useInspection(inspectionId);
  const { saveDraft, start, addPhoto, deletePhoto } = useInspectionMutations(inspectionId);

  const [items, setItems] = useState<Record<string, ItemDraft>>({});
  const [odometerReading, setOdometerReading] = useState<string>("");
  const [verifiedVin, setVerifiedVin] = useState("");
  const [vinVerified, setVinVerified] = useState(false);
  const [notes, setNotes] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [online, setOnline] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [findingOpen, setFindingOpen] = useState(false);
  const [findingDefaults, setFindingDefaults] = useState<
    Partial<{
      inspectionItemId: string | null;
      sectionId: string | null;
      result: InspectionItemResult;
      severity: InspectionSeverity;
      title: string;
    }>
  >({});
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingInspectionUpload[]>([]);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [photoCategory, setPhotoCategory] = useState<InspectionPhotoCategory>("other");
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const persistLocal = useCallback(
    (next: {
      items: Record<string, ItemDraft>;
      odometerReading: string;
      verifiedVin: string;
      vinVerified: boolean;
      notes: string;
    }) => {
      try {
        localStorage.setItem(DRAFT_KEY(inspectionId), JSON.stringify(next));
      } catch {
        // ignore quota / private mode
      }
    },
    [inspectionId],
  );

  const hydrateFromInspection = useEffectEvent(() => {
    const inspection = query.data;
    if (!inspection || hydrated.current) return;

    const local = readLocalDraft(inspectionId);
    const draftItems = {
      ...buildItemMap(inspection.items),
      ...(local?.items ?? {}),
    };

    startTransition(() => {
      setItems(draftItems);
      setOdometerReading(
        local?.odometerReading ?? inspection.odometerReading?.toString() ?? "",
      );
      setVerifiedVin(
        local?.verifiedVin ?? inspection.verifiedVin ?? inspection.vehicleVin ?? "",
      );
      setVinVerified(local?.vinVerified ?? Boolean(inspection.vinVerified));
      setNotes(local?.notes ?? inspection.notes ?? "");
      setActiveSectionId(inspection.sections[0]?.id ?? null);
      setExpandedSections(
        Object.fromEntries(inspection.sections.map((section) => [section.id, true])),
      );
    });

    hydrated.current = true;

    if (
      (inspection.status === "draft" || inspection.status === "assigned") &&
      canEditInspectionChecklist(inspection.status)
    ) {
      void start.mutateAsync().catch(() => undefined);
    }
  });

  useEffect(() => {
    if (!query.data || hydrated.current) return;
    hydrateFromInspection();
  }, [query.data, inspectionId]);

  const buildPayload = useCallback((): SaveInspectionDraftValues => {
    const reading = odometerReading.trim() === "" ? null : Number(odometerReading);
    const vehicleVin = query.data?.vehicleVin ?? null;
    const mismatch =
      vinVerified &&
      Boolean(verifiedVin.trim()) &&
      Boolean(vehicleVin) &&
      verifiedVin.trim().toUpperCase() !== vehicleVin!.toUpperCase();

    return {
      odometerReading: Number.isFinite(reading as number) ? (reading as number) : null,
      odometerUnit: query.data?.odometerUnit || "KM",
      notes: notes || null,
      vinVerified,
      vinMismatch: mismatch,
      verifiedVin: verifiedVin.trim() || null,
      items: Object.values(items).map((item) => ({
        id: item.id,
        result: item.result,
        severity: needsSeverity(item.result) ? item.severity : null,
        notes: item.notes,
      })),
    };
  }, [items, notes, odometerReading, query.data?.odometerUnit, query.data?.vehicleVin, verifiedVin, vinVerified]);

  const saveNow = useCallback(async () => {
    if (!query.data || !canEditInspectionChecklist(query.data.status)) return;
    setSaveStatus("saving");
    try {
      await saveDraft.mutateAsync(buildPayload());
      setDirty(false);
      setSaveStatus("saved");
      try {
        localStorage.removeItem(DRAFT_KEY(inspectionId));
      } catch {
        // ignore
      }
    } catch (error) {
      setSaveStatus("error");
      toast.error(error instanceof Error ? error.message : t("inspections.toasts.error"));
    }
  }, [buildPayload, inspectionId, query.data, saveDraft, t]);

  const scheduleAutosave = useEffectEvent(() => {
    persistLocal({ items, odometerReading, verifiedVin, vinVerified, notes });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveNow();
    }, 1500);
  });

  useEffect(() => {
    if (!dirty) return;
    scheduleAutosave();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, items, notes, odometerReading, verifiedVin, vinVerified]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaveStatus("pending");
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<ItemDraft>) => {
      setItems((current) => {
        const prev = current[id];
        if (!prev) return current;
        const next = { ...prev, ...patch };
        if (!needsSeverity(next.result)) next.severity = null;
        return { ...current, [id]: next };
      });
      markDirty();
    },
    [markDirty],
  );

  const inspection = query.data;
  const sections = useMemo(() => inspection?.sections ?? [], [inspection?.sections]);
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeSectionId),
  );
  const activeSection = sections[activeIndex] ?? null;

  const goToSection = useCallback((sectionId: string | null) => {
    if (!sectionId) return;
    setActiveSectionId(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const sectionItems = useMemo(() => {
    if (!inspection || !activeSection) return [];
    return inspection.items
      .filter((item) => item.sectionId === activeSection.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [activeSection, inspection]);

  const sectionItemIds = useMemo(
    () => new Set(sectionItems.map((item) => item.id)),
    [sectionItems],
  );

  function findingsForItem(item: InspectionItem): InspectionFinding[] {
    const all = inspection?.findings ?? [];
    const byId = all.filter((finding) => finding.inspectionItemId === item.id);
    if (byId.length > 0) return byId;

    const itemName = item.name.trim().toLowerCase();
    return all.filter((finding) => {
      if (finding.inspectionItemId) return false;
      if (finding.sectionId && item.sectionId && finding.sectionId !== item.sectionId) {
        return false;
      }
      const title = finding.title.trim().toLowerCase();
      return title === itemName || title.includes(itemName) || itemName.includes(title);
    });
  }

  const activeSectionFindingCount = useMemo(() => {
    if (!activeSection || !inspection) return 0;
    return inspection.findings.filter(
      (finding) =>
        finding.sectionId === activeSection.id ||
        (finding.inspectionItemId != null && sectionItemIds.has(finding.inspectionItemId)),
    ).length;
  }, [activeSection, inspection, sectionItemIds]);

  const identityOdometerFindings = useMemo(() => {
    if (!inspection) return [];
    return inspection.findings.filter((finding) => {
      const title = finding.title.toLowerCase();
      const item = inspection.items.find((entry) => entry.id === finding.inspectionItemId);
      const itemName = item?.name.toLowerCase() ?? "";
      return title.includes("odometer") || itemName.includes("odometer");
    });
  }, [inspection]);

  const identityVinFindings = useMemo(() => {
    if (!inspection) return [];
    return inspection.findings.filter((finding) => {
      const title = finding.title.toLowerCase();
      const item = inspection.items.find((entry) => entry.id === finding.inspectionItemId);
      const itemName = item?.name.toLowerCase() ?? "";
      return (
        title.includes("vin") ||
        itemName.includes("vin") ||
        title.includes("chassis") ||
        itemName.includes("chassis")
      );
    });
  }, [inspection]);

  const progressCounts = useMemo(() => {
    const values = Object.values(items);
    const completed = values.filter((item) => item.result != null).length;
    const failed = values.filter((item) => item.result === "fail").length;
    const critical = values.filter(
      (item) => item.result === "fail" && item.severity === "critical",
    ).length;
    return {
      completed,
      total: values.length,
      failed,
      critical,
      sectionsCompleted: sections.filter((section) => {
        const sectionItemIds = (inspection?.items ?? [])
          .filter((item) => item.sectionId === section.id)
          .map((item) => item.id);
        return (
          sectionItemIds.length > 0 &&
          sectionItemIds.every((id) => items[id]?.result != null)
        );
      }).length,
      sectionsTotal: sections.length,
    };
  }, [inspection?.items, items, sections]);

  const readingNumber =
    odometerReading.trim() === "" ? null : Number(odometerReading);
  const showOdometerWarning = odometerMismatch(
    Number.isFinite(readingNumber as number) ? (readingNumber as number) : null,
    inspection?.vehicleMileage ?? null,
  );
  const vinMismatch =
    vinVerified &&
    Boolean(verifiedVin.trim()) &&
    Boolean(inspection?.vehicleVin) &&
    verifiedVin.trim().toUpperCase() !== inspection!.vehicleVin!.toUpperCase();

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0 || !inspection) return;
    setUploading(true);

    const queue = Array.from(files).map((file) => {
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      return { file, localId, previewUrl };
    });

    setPendingUploads((current) => [
      ...current,
      ...queue.map(({ file, localId, previewUrl }) => ({
        localId,
        previewUrl,
        fileName: file.name,
        category: photoCategory,
        progress: 0,
        status: "uploading" as const,
      })),
    ]);

    let successCount = 0;
    try {
      for (const item of queue) {
        const path = `${inspection.id}/${crypto.randomUUID()}-${safeFileName(item.file.name)}`;
        try {
          await uploadInspectionFileWithProgress(item.file, path, (percent) => {
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

          await addPhoto.mutateAsync({
            storagePath: path,
            category: photoCategory,
            caption: null,
            inspectionItemId: null,
            sectionId: activeSectionId,
            findingId: null,
          });

          successCount += 1;
          setPendingUploads((current) =>
            current.filter((pending) => {
              if (pending.localId !== item.localId) return true;
              if (pending.previewUrl.startsWith("blob:")) URL.revokeObjectURL(pending.previewUrl);
              return false;
            }),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : t("inspections.perform.uploadFailed");
          setPendingUploads((current) =>
            current.map((pending) =>
              pending.localId === item.localId
                ? { ...pending, status: "error", errorMessage: message, progress: pending.progress }
                : pending,
            ),
          );
          toast.error(message);
        }
      }

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? t("inspections.toasts.photoAdded")
            : t("inspections.toasts.photosAdded", { count: successCount }),
        );
      }
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  async function removePhoto(photoId: string) {
    setRemovingPhotoId(photoId);
    try {
      await deletePhoto.mutateAsync(photoId);
      toast.success(t("inspections.toasts.photoRemoved"));
    } finally {
      setRemovingPhotoId(null);
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

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError || !inspection) {
    return (
      <EmptyState
        title={t("inspections.empty.notFound")}
        description={t("inspections.empty.notFoundHint")}
        action={
          <Link href="/inspections" className={buttonVariants()}>
            {t("inspections.actions.back")}
          </Link>
        }
      />
    );
  }

  const editable = canEditInspectionChecklist(inspection.status);
  const canSubmit = canSubmitInspection(inspection.status);
  const vehicleTitle =
    [inspection.vehicleYear, inspection.vehicleMake, inspection.vehicleModel]
      .filter(Boolean)
      .join(" ") || inspection.inspectionNumber;

  const saveLabel =
    saveStatus === "saving"
      ? t("inspections.perform.saving")
      : saveStatus === "saved"
        ? t("inspections.perform.saved")
        : saveStatus === "pending"
          ? t("inspections.perform.unsaved")
          : saveStatus === "error"
            ? t("inspections.perform.saveError")
            : null;

  return (
    <div className="flex flex-col gap-3 pb-20 lg:pb-24">
      <div className="bg-background/95 sticky top-0 z-20 -mx-4 border-b px-4 py-2.5 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              {t("inspections.perform.title")}
            </h1>
            <p className="text-muted-foreground truncate text-xs sm:text-sm">
              {inspection.inspectionNumber} · {vehicleTitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                online
                  ? "bg-emerald-600/10 text-emerald-900 dark:text-emerald-100"
                  : "bg-amber-600/10 text-amber-950 dark:text-amber-100",
              )}
            >
              {online ? <WifiIcon className="size-3.5" aria-hidden /> : <CloudOffIcon className="size-3.5" aria-hidden />}
              {online ? t("inspections.offline.online") : t("inspections.offline.offline")}
            </span>
            {saveLabel ? (
              <span aria-live="polite" aria-busy={saveStatus === "saving"}>
                {saveLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-2 grid gap-1">
          <InspectionProgressBar
            completed={progressCounts.completed}
            total={progressCounts.total}
            label={t("inspections.progress.items", {
              completed: progressCounts.completed,
              total: progressCounts.total,
            })}
          />
          <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
            <span>
              {t("inspections.progress.sections", {
                completed: progressCounts.sectionsCompleted,
                total: progressCounts.sectionsTotal,
              })}
            </span>
            {progressCounts.critical > 0 ? (
              <span className="text-rose-700 dark:text-rose-300 font-medium">
                {t("inspections.progress.critical", { count: progressCounts.critical })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <nav
        className="bg-card sticky top-19 z-10 -mx-4 overflow-x-auto border-y px-4 py-1.5 md:top-21 md:mx-0 md:rounded-xl md:border"
        aria-label={t("inspections.perform.sectionNav")}
      >
        <ul className="flex w-max min-w-full gap-2">
          {sections.map((section, index) => {
            const sectionItemIdList = inspection.items
              .filter((item) => item.sectionId === section.id)
              .map((item) => item.id);
            const done =
              sectionItemIdList.length > 0 &&
              sectionItemIdList.every((id) => items[id]?.result != null);
            const findingCount = inspection.findings.filter(
              (finding) =>
                finding.sectionId === section.id ||
                (finding.inspectionItemId != null &&
                  sectionItemIdList.includes(finding.inspectionItemId)),
            ).length;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  className={cn(
                    "h-10 min-w-28 rounded-lg border px-3 text-start text-xs font-medium",
                    activeSectionId === section.id
                      ? "border-primary bg-primary/10"
                      : "bg-background",
                    done && "ring-emerald-600/30 ring-2",
                  )}
                  aria-current={activeSectionId === section.id ? "true" : undefined}
                  onClick={() => goToSection(section.id)}
                >
                  <span className="text-muted-foreground flex items-center justify-between gap-2 tabular-nums">
                    <span>
                      {index + 1}/{sections.length}
                    </span>
                    {findingCount > 0 ? (
                      <span className="bg-amber-600/20 text-amber-950 dark:text-amber-100 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                        {findingCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="line-clamp-1">
                    {sectionLabel(t, section.sectionKey, section.name)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="bg-card grid gap-3 rounded-xl border p-3 sm:p-4">
        <h2 className="text-base font-semibold">{t("inspections.perform.identity")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <FormField label={t("inspections.fields.odometer")} htmlFor="perform-odometer">
              <Input
                id="perform-odometer"
                type="number"
                min={0}
                inputMode="numeric"
                className="h-11 text-base"
                disabled={!editable}
                value={odometerReading}
                onChange={(event) => {
                  setOdometerReading(event.target.value);
                  markDirty();
                }}
              />
            </FormField>
            <InspectionFindingsList
              findings={identityOdometerFindings}
              compact
              hideEmpty
              inspectionId={inspectionId}
              editable={editable}
            />
          </div>
          <div className="grid gap-2">
            <FormField label={t("inspections.fields.verifiedVin")} htmlFor="perform-vin">
              <Input
                id="perform-vin"
                className="h-11 font-mono text-base"
                disabled={!editable}
                value={verifiedVin}
                onChange={(event) => {
                  setVerifiedVin(event.target.value);
                  markDirty();
                }}
              />
            </FormField>
            <InspectionFindingsList
              findings={identityVinFindings}
              compact
              hideEmpty
              inspectionId={inspectionId}
              editable={editable}
            />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={vinVerified}
            disabled={!editable}
            onChange={(event) => {
              setVinVerified(event.target.checked);
              markDirty();
            }}
          />
          {t("inspections.fields.vinVerified")}
        </label>
        {showOdometerWarning ? (
          <Alert variant="destructive">
            <AlertTriangleIcon aria-hidden />
            <AlertTitle>{t("inspections.warnings.odometerTitle")}</AlertTitle>
            <AlertDescription>
              {t("inspections.warnings.odometerBody", {
                vehicle: inspection.vehicleMileage ?? 0,
                reading: readingNumber ?? 0,
              })}
            </AlertDescription>
          </Alert>
        ) : null}
        {vinMismatch ? (
          <Alert variant="destructive">
            <AlertTriangleIcon aria-hidden />
            <AlertTitle>{t("inspections.warnings.vinTitle")}</AlertTitle>
            <AlertDescription>
              {t("inspections.warnings.vinBody", {
                vehicle: inspection.vehicleVin ?? "",
                verified: verifiedVin,
              })}
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      {activeSection ? (
        <section className="grid gap-3">
          <details
            open={expandedSections[activeSection.id] !== false}
            className="bg-card rounded-xl border"
            onToggle={(event) => {
              const open = (event.target as HTMLDetailsElement).open;
              setExpandedSections((current) => ({ ...current, [activeSection.id]: open }));
            }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-base font-semibold sm:px-4">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate">
                  {sectionLabel(t, activeSection.sectionKey, activeSection.name)}
                </span>
                {activeSectionFindingCount > 0 ? (
                  <span className="bg-amber-600/15 text-amber-950 dark:text-amber-100 rounded-full px-2 py-0.5 text-xs font-medium">
                    {t("inspections.perform.findingCount", {
                      count: activeSectionFindingCount,
                    })}
                  </span>
                ) : null}
              </span>
              <ChevronDownIcon className="size-5 shrink-0 opacity-60" aria-hidden />
            </summary>
            <div className="grid gap-3 border-t p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
              {sectionItems.map((item) => {
                const draft = items[item.id];
                const itemFindings = findingsForItem(item);
                return (
                  <article
                    key={item.id}
                    className="bg-background/60 grid gap-2.5 rounded-xl border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium sm:text-base">{item.name}</h3>
                          {itemFindings.length > 0 ? (
                            <span className="bg-amber-600/15 text-amber-950 dark:text-amber-100 rounded-full px-2 py-0.5 text-[11px] font-medium">
                              {t("inspections.perform.itemFindings", {
                                count: itemFindings.length,
                              })}
                            </span>
                          ) : null}
                        </div>
                        {item.isRequired ? (
                          <p className="text-muted-foreground text-xs">
                            {t("inspections.perform.required")}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={!editable}
                        onClick={() => {
                          setFindingDefaults({
                            inspectionItemId: item.id,
                            sectionId: activeSection.id,
                            result: draft?.result === "advisory" ? "advisory" : "fail",
                            severity: draft?.severity ?? "moderate",
                            title: item.name,
                          });
                          setFindingOpen(true);
                        }}
                      >
                        <PlusIcon aria-hidden />
                        {t("inspections.actions.addFinding")}
                      </Button>
                    </div>

                    <div
                      className="grid grid-cols-2 gap-1.5 xl:grid-cols-5"
                      role="group"
                      aria-label={t("inspections.perform.itemResult")}
                    >
                      {RESULT_BUTTONS.map((button) => {
                        const Icon = button.icon;
                        const active = draft?.result === button.result;
                        return (
                          <button
                            key={button.result}
                            type="button"
                            disabled={!editable}
                            data-active={active}
                            className={cn(
                              "flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 sm:h-14 sm:rounded-xl sm:text-xs",
                              button.className,
                            )}
                            aria-pressed={active}
                            onClick={() =>
                              updateItem(item.id, {
                                result: button.result,
                                severity:
                                  needsSeverity(button.result)
                                    ? draft?.severity ?? "moderate"
                                    : null,
                              })
                            }
                          >
                            <Icon className="size-4 sm:size-5" aria-hidden />
                            {t(`inspections.itemResults.${button.result}`)}
                          </button>
                        );
                      })}
                    </div>

                    {needsSeverity(draft?.result ?? null) ? (
                      <FormField
                        label={t("inspections.fields.severity")}
                        htmlFor={`severity-${item.id}`}
                      >
                        <SearchableSelect
                          id={`severity-${item.id}`}
                          value={draft?.severity ?? ""}
                          onValueChange={(value) =>
                            updateItem(item.id, {
                              severity: (value || null) as InspectionSeverity | null,
                            })
                          }
                          searchable={false}
                          disabled={!editable}
                          placeholder={t("inspections.fields.selectPlaceholder")}
                          options={INSPECTION_SEVERITIES.map((severity) => ({
                            value: severity,
                            label: t(`inspections.severities.${severity}`),
                          }))}
                        />
                      </FormField>
                    ) : null}

                    <FormField
                      label={t("inspections.fields.notes")}
                      htmlFor={`notes-${item.id}`}
                    >
                      <Textarea
                        id={`notes-${item.id}`}
                        rows={2}
                        className="min-h-16 text-base"
                        disabled={!editable}
                        value={draft?.notes ?? ""}
                        onChange={(event) =>
                          updateItem(item.id, { notes: event.target.value || null })
                        }
                      />
                    </FormField>

                    <div className="bg-muted/30 grid gap-2 rounded-lg border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold tracking-wide uppercase">
                          {t("inspections.tabs.findings")}
                          {itemFindings.length > 0 ? ` (${itemFindings.length})` : ""}
                        </p>
                      </div>
                      {itemFindings.length > 0 ? (
                        <InspectionFindingsList
                          findings={itemFindings}
                          compact
                          hideEmpty
                          inspectionId={inspectionId}
                          editable={editable}
                        />
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          {t("inspections.perform.noItemFindings")}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        </section>
      ) : null}

      <section className="bg-card grid gap-3 rounded-xl border p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t("inspections.perform.photos")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("inspections.perform.photoCount", {
              count: inspection.photos.length + pendingUploads.filter((p) => p.status !== "error").length,
            })}
          </p>
        </div>
        <FormField label={t("inspections.fields.photoCategory")} htmlFor="photo-category">
          <SearchableSelect
            id="photo-category"
            value={photoCategory}
            onValueChange={(value) => setPhotoCategory(value as InspectionPhotoCategory)}
            searchable={false}
            disabled={!editable || uploading}
            options={INSPECTION_PHOTO_CATEGORIES.map((category) => ({
              value: category,
              label: t(`inspections.photoCategories.${category}`),
            }))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12"
            disabled={!editable || uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            <CameraIcon aria-hidden />
            {t("inspections.perform.capture")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12"
            disabled={!editable || uploading}
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageIcon aria-hidden />
            {t("inspections.perform.gallery")}
          </Button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event: ChangeEvent<HTMLInputElement>) => void uploadFiles(event.target.files)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event: ChangeEvent<HTMLInputElement>) => void uploadFiles(event.target.files)}
        />
        {uploading ? (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {t("inspections.perform.uploading")}
          </p>
        ) : null}
        <InspectionPhotosGrid
          photos={inspection.photos}
          pending={pendingUploads}
          canRemove={
            editable &&
            (can("inspection.photo.delete") || can("inspection.edit"))
          }
          removingId={removingPhotoId}
          onRemove={removePhoto}
          onDismissPending={dismissFailedUpload}
        />
      </section>

      <FormField label={t("inspections.fields.notes")} htmlFor="perform-notes">
        <Textarea
          id="perform-notes"
          rows={3}
          className="text-base"
          disabled={!editable}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            markDirty();
          }}
        />
      </FormField>

      <div className="bg-background/95 fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 border-t p-2.5 backdrop-blur lg:bottom-0 lg:p-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-20 flex-1 sm:h-12 sm:min-w-24"
            disabled={activeIndex <= 0}
            onClick={() => goToSection(sections[activeIndex - 1]?.id ?? null)}
          >
            <ChevronLeftIcon aria-hidden className="rtl:rotate-180" />
            {t("inspections.actions.previous")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-20 flex-1 sm:h-12 sm:min-w-24"
            disabled={activeIndex >= sections.length - 1}
            onClick={() => goToSection(sections[activeIndex + 1]?.id ?? null)}
          >
            {t("inspections.actions.next")}
            <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 min-w-24 flex-1 sm:h-12 sm:min-w-28"
            disabled={!editable || saveStatus === "saving"}
            aria-busy={saveStatus === "saving"}
            onClick={() => void saveNow()}
          >
            {t("inspections.actions.saveDraft")}
          </Button>
          <Button
            type="button"
            className="h-11 min-w-24 flex-1 sm:h-12 sm:min-w-28"
            disabled={!editable || !canSubmit}
            onClick={async () => {
              if (dirty) await saveNow();
              setSubmitOpen(true);
            }}
          >
            {t("inspections.actions.submit")}
          </Button>
        </div>
      </div>

      <InspectionSubmitDialog
        inspectionId={inspectionId}
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        progress={{
          sectionsCompleted: progressCounts.sectionsCompleted,
          sectionsTotal: progressCounts.sectionsTotal,
          itemsCompleted: progressCounts.completed,
          itemsTotal: progressCounts.total,
          itemsRemaining: Math.max(0, progressCounts.total - progressCounts.completed),
          failedItems: progressCounts.failed,
          advisoryItems: Object.values(items).filter((item) => item.result === "advisory")
            .length,
          criticalFindings: progressCounts.critical,
          photosCount: inspection.photos.length,
          estimatedRepairsTotal: inspection.progress.estimatedRepairsTotal,
        }}
        onSubmitted={() => router.push(`/inspections/${inspectionId}`)}
      />

      <InspectionFindingDialog
        inspectionId={inspectionId}
        open={findingOpen}
        onOpenChange={setFindingOpen}
        defaults={findingDefaults}
      />
    </div>
  );
}
