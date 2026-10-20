import type { UserContext } from "@/types/auth";
import type { Json } from "@/types/database";
import type { VehiclePhoto, VehiclePhotoCategory } from "@/types/vehicle-photo";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";
import { hasPermission } from "@/lib/permissions";
import type {
  AddVehiclePhotoValues,
  ReorderVehiclePhotosValues,
  UpdateVehiclePhotoValues,
} from "@/lib/validation/vehicle-photo";

export type PhotoServiceError = {
  code: "forbidden" | "not_found" | "validation" | "conflict" | "unknown";
  message: string;
};

export type ServiceResult<T> = {
  data: T | null;
  error: PhotoServiceError | null;
};

type PhotoRow = {
  id: string;
  vehicle_id: string;
  storage_path: string;
  category: VehiclePhotoCategory;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  sort_order: number;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

const PHOTO_SELECT =
  "id, vehicle_id, storage_path, category, file_name, mime_type, file_size, sort_order, is_primary, uploaded_by, created_at, updated_at";

function canView(context: UserContext) {
  return hasPermission(context.permissions, "vehicle.view", context.roles);
}

function canMutate(context: UserContext) {
  return (
    hasPermission(context.permissions, "vehicle.edit", context.roles) ||
    hasPermission(context.permissions, "vehicle.create", context.roles)
  );
}

/** Users who can create but not edit vehicles (e.g. Accountants) only add photos to cars they created. */
function canEditAnyVehicle(context: UserContext) {
  return hasPermission(context.permissions, "vehicle.edit", context.roles);
}

function mapDbError(error: { message?: string; code?: string }): PhotoServiceError {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("not authorized") || message.includes("permission")) {
    return { code: "forbidden", message: "Not authorized." };
  }
  if (message.includes("not found") || error.code === "PGRST116") {
    return { code: "not_found", message: "Photo not found." };
  }
  if (error.code === "23505") {
    return { code: "conflict", message: "A primary photo already exists." };
  }
  return { code: "unknown", message: error.message ?? "Unexpected error." };
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  vehicleId: string,
  oldValues: Json | null,
  newValues: Json | null,
) {
  try {
    await supabase.rpc("write_audit_log", {
      p_action: action,
      p_entity_type: "vehicles",
      p_entity_id: vehicleId,
      p_old_values: oldValues,
      p_new_values: newValues,
      p_metadata: null,
    });
  } catch {
    /* best-effort */
  }
}

async function loadProfileNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: Array<string | null>,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  for (const row of data ?? []) {
    const r = row as { id: string; display_name: string | null };
    map.set(r.id, r.display_name ?? r.id);
  }
  return map;
}

function mapPhoto(row: PhotoRow, names: Map<string, string>, url: string | null = null): VehiclePhoto {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    category: row.category,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by ? (names.get(row.uploaded_by) ?? null) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    url,
  };
}

async function attachUrls(
  photos: VehiclePhoto[],
): Promise<VehiclePhoto[]> {
  return Promise.all(
    photos.map(async (photo) => {
      const { url } = await createSignedStorageUrl("vehicle-photos", photo.storagePath);
      return { ...photo, url };
    }),
  );
}

async function assertVehicleAccess(
  vehicleId: string,
  context: UserContext,
  write: boolean,
): Promise<ServiceResult<{ id: string }>> {
  if (write ? !canMutate(context) : !canView(context)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, created_by")
    .eq("id", vehicleId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { data: null, error: mapDbError(error) };
  if (!data) return { data: null, error: { code: "not_found", message: "Vehicle not found." } };
  const row = data as { id: string; created_by: string | null };
  if (write && !canEditAnyVehicle(context) && row.created_by !== context.userId) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }
  return { data: { id: row.id }, error: null };
}

/**
 * Split inventory records share photo files (see split_vehicle_units), so a storage
 * object is only removed once no photo row references it any more.
 */
async function removePhotoFileIfUnused(path: string) {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("vehicle_photos")
    .select("id", { count: "exact", head: true })
    .eq("storage_path", path);
  if ((count ?? 0) > 0) return { error: null };
  return admin.storage.from("vehicle-photos").remove([path]);
}

export async function listVehiclePhotos(
  vehicleId: string,
  context: UserContext,
): Promise<ServiceResult<VehiclePhoto[]>> {
  const access = await assertVehicleAccess(vehicleId, context, false);
  if (access.error) return { data: null, error: access.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_photos")
    .select(PHOTO_SELECT)
    .eq("vehicle_id", vehicleId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: mapDbError(error) };

  const rows = (data ?? []) as PhotoRow[];
  const names = await loadProfileNames(
    supabase,
    rows.map((row) => row.uploaded_by),
  );
  const mapped = rows.map((row) => mapPhoto(row, names));
  return { data: await attachUrls(mapped), error: null };
}

export async function getPrimaryPhotoUrls(
  vehicleIds: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (vehicleIds.length === 0) return result;

  const supabase = await createClient();
  // Prefer primary photo; otherwise first by sort_order (gallery fallback).
  const { data } = await supabase
    .from("vehicle_photos")
    .select("vehicle_id, storage_path, is_primary, sort_order")
    .in("vehicle_id", vehicleIds)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  const chosen = new Map<string, string>();
  for (const row of (data ?? []) as Array<{
    vehicle_id: string;
    storage_path: string;
  }>) {
    if (!chosen.has(row.vehicle_id)) {
      chosen.set(row.vehicle_id, row.storage_path);
    }
  }

  await Promise.all(
    [...chosen.entries()].map(async ([vehicleId, storagePath]) => {
      const { url } = await createSignedStorageUrl("vehicle-photos", storagePath, 60 * 30);
      result.set(vehicleId, url);
    }),
  );
  return result;
}

export async function addVehiclePhoto(
  vehicleId: string,
  values: AddVehiclePhotoValues,
  context: UserContext,
): Promise<ServiceResult<VehiclePhoto>> {
  const access = await assertVehicleAccess(vehicleId, context, true);
  if (access.error) return { data: null, error: access.error };

  if (!values.storagePath.startsWith(`${vehicleId}/`)) {
    return {
      data: null,
      error: { code: "validation", message: "Invalid storage path for vehicle." },
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("vehicle_photos")
    .select("id, is_primary, sort_order")
    .eq("vehicle_id", vehicleId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const maxSort =
    existing && existing.length > 0
      ? Number((existing[0] as { sort_order: number }).sort_order)
      : -1;

  const { count } = await supabase
    .from("vehicle_photos")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId);

  const isFirst = (count ?? 0) === 0;
  let makePrimary = Boolean(values.isPrimary) || isFirst;
  if (!makePrimary) {
    const { count: primaryCount } = await supabase
      .from("vehicle_photos")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", vehicleId)
      .eq("is_primary", true);
    if ((primaryCount ?? 0) === 0) makePrimary = true;
  }

  if (makePrimary) {
    await supabase
      .from("vehicle_photos")
      .update({ is_primary: false })
      .eq("vehicle_id", vehicleId)
      .eq("is_primary", true);
  }

  const { data, error } = await supabase
    .from("vehicle_photos")
    .insert({
      vehicle_id: vehicleId,
      storage_path: values.storagePath,
      category: values.category,
      file_name: values.fileName,
      mime_type: values.mimeType ?? null,
      file_size: values.fileSize ?? null,
      sort_order: values.sortOrder ?? maxSort + 1,
      is_primary: makePrimary,
      uploaded_by: context.userId,
    })
    .select(PHOTO_SELECT)
    .single();

  if (error) return { data: null, error: mapDbError(error) };

  const row = data as PhotoRow;
  await writeAudit(supabase, "VEHICLE_IMAGE_UPLOADED", vehicleId, null, {
    photo_id: row.id,
    category: row.category,
    storage_path: row.storage_path,
  });

  const names = await loadProfileNames(supabase, [row.uploaded_by]);
  const [withUrl] = await attachUrls([mapPhoto(row, names)]);
  return { data: withUrl!, error: null };
}

export async function updateVehiclePhoto(
  vehicleId: string,
  photoId: string,
  values: UpdateVehiclePhotoValues,
  context: UserContext,
): Promise<ServiceResult<VehiclePhoto>> {
  const access = await assertVehicleAccess(vehicleId, context, true);
  if (access.error) return { data: null, error: access.error };

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("vehicle_photos")
    .select(PHOTO_SELECT)
    .eq("id", photoId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (existingError) return { data: null, error: mapDbError(existingError) };
  if (!existing) return { data: null, error: { code: "not_found", message: "Photo not found." } };

  const old = existing as PhotoRow;

  if (values.isPrimary === true) {
    const { data, error } = await supabase.rpc("set_vehicle_photo_primary", {
      p_photo_id: photoId,
    });
    if (error) return { data: null, error: mapDbError(error) };
    await writeAudit(supabase, "VEHICLE_IMAGE_SET_PRIMARY", vehicleId, {
      photo_id: photoId,
      is_primary: false,
    }, {
      photo_id: photoId,
      is_primary: true,
      category: old.category,
    });
    const row = (Array.isArray(data) ? data[0] : data) as PhotoRow;
    const names = await loadProfileNames(supabase, [row.uploaded_by]);
    const [withUrl] = await attachUrls([mapPhoto(row, names)]);
    return { data: withUrl!, error: null };
  }

  const patch: Record<string, unknown> = {};
  if (values.category != null) patch.category = values.category;
  if (values.sortOrder != null) patch.sort_order = values.sortOrder;
  if (values.storagePath != null) patch.storage_path = values.storagePath;
  if (values.fileName != null) patch.file_name = values.fileName;
  if (values.mimeType !== undefined) patch.mime_type = values.mimeType;
  if (values.fileSize !== undefined) patch.file_size = values.fileSize;
  if (values.isPrimary === false) patch.is_primary = false;

  const replacing = Boolean(values.storagePath && values.storagePath !== old.storage_path);

  const { data, error } = await supabase
    .from("vehicle_photos")
    .update(patch)
    .eq("id", photoId)
    .eq("vehicle_id", vehicleId)
    .select(PHOTO_SELECT)
    .single();

  if (error) return { data: null, error: mapDbError(error) };

  if (replacing) {
    await removePhotoFileIfUnused(old.storage_path);
    await writeAudit(supabase, "VEHICLE_IMAGE_REPLACED", vehicleId, {
      photo_id: photoId,
      storage_path: old.storage_path,
    }, {
      photo_id: photoId,
      storage_path: values.storagePath,
      category: values.category ?? old.category,
    });
  }

  const row = data as PhotoRow;
  const names = await loadProfileNames(supabase, [row.uploaded_by]);
  const [withUrl] = await attachUrls([mapPhoto(row, names)]);
  return { data: withUrl!, error: null };
}

export async function reorderVehiclePhotos(
  vehicleId: string,
  values: ReorderVehiclePhotosValues,
  context: UserContext,
): Promise<ServiceResult<VehiclePhoto[]>> {
  const access = await assertVehicleAccess(vehicleId, context, true);
  if (access.error) return { data: null, error: access.error };

  const supabase = await createClient();
  for (let index = 0; index < values.orderedIds.length; index += 1) {
    const id = values.orderedIds[index]!;
    const { error } = await supabase
      .from("vehicle_photos")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("vehicle_id", vehicleId);
    if (error) return { data: null, error: mapDbError(error) };
  }

  await writeAudit(supabase, "VEHICLE_IMAGE_REORDERED", vehicleId, null, {
    ordered_ids: values.orderedIds,
  });

  return listVehiclePhotos(vehicleId, context);
}

export async function deleteVehiclePhoto(
  vehicleId: string,
  photoId: string,
  context: UserContext,
): Promise<ServiceResult<{ id: string }>> {
  const access = await assertVehicleAccess(vehicleId, context, true);
  if (access.error) return { data: null, error: access.error };

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("vehicle_photos")
    .select(PHOTO_SELECT)
    .eq("id", photoId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (existingError) return { data: null, error: mapDbError(existingError) };
  if (!existing) return { data: null, error: { code: "not_found", message: "Photo not found." } };

  const row = existing as PhotoRow;
  const { error: deleteError } = await supabase
    .from("vehicle_photos")
    .delete()
    .eq("id", photoId)
    .eq("vehicle_id", vehicleId);

  if (deleteError) return { data: null, error: mapDbError(deleteError) };

  const { error: storageError } = await removePhotoFileIfUnused(row.storage_path);

  if (storageError) {
    return {
      data: null,
      error: {
        code: "unknown",
        message: storageError.message || "Photo record removed but storage delete failed.",
      },
    };
  }

  if (row.is_primary) {
    const { data: next } = await supabase
      .from("vehicle_photos")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.rpc("set_vehicle_photo_primary", {
        p_photo_id: (next as { id: string }).id,
      });
    }
  }

  await writeAudit(supabase, "VEHICLE_IMAGE_DELETED", vehicleId, {
    photo_id: photoId,
    category: row.category,
    storage_path: row.storage_path,
  }, null);

  return { data: { id: photoId }, error: null };
}
