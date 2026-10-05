import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { isValidVehicleStatusTransition } from "@/lib/vehicles/status-transitions";
import { getPrimaryPhotoUrls } from "@/lib/vehicles/photos";
import type { UserContext } from "@/types/auth";
import type {
  BranchOption,
  InventorySummary,
  LocationOption,
  MakeOption,
  ModelOption,
  VehicleActivityItem,
  VehicleDetail,
  VehicleListItem,
  VehicleListResult,
  VehicleStatus,
  VehicleStatusHistoryItem,
} from "@/types/vehicle";
import type {
  ArchiveVehicleValues,
  ChangeVehicleStatusValues,
  CreateVehicleValues,
  MarkReadyForSaleValues,
  TransferVehicleValues,
  UpdateVehicleValues,
  VehicleListQuery,
} from "@/lib/validation/vehicle";
import type { ReadyForSaleEligibility, ReadyForSaleBlocker, ReadyForSaleAction } from "@/types/ready-for-sale";
import type { InspectionResult } from "@/types/inspection";

export type VehicleServiceError = {
  code:
    | "not_found"
    | "forbidden"
    | "duplicate_vin"
    | "duplicate_chassis"
    | "invalid_transition"
    | "validation"
    | "conflict"
    | "not_eligible"
    | "unknown";
  message: string;
  existingVehicleId?: string;
  blockers?: unknown;
};

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: VehicleServiceError };

type VehicleRow = {
  id: string;
  stock_number: string;
  vin: string | null;
  chassis_number: string | null;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  mileage: number;
  mileage_unit: "km" | "mi";
  exterior_color: string | null;
  interior_color: string | null;
  body_type: string | null;
  transmission: VehicleListItem["transmission"];
  fuel_type: VehicleListItem["fuelType"];
  engine_size: string | null;
  engine_cylinders: number | null;
  seats: number | null;
  doors: number | null;
  drive_type: VehicleDetail["driveType"];
  origin_type: VehicleListItem["originType"];
  country_of_origin: string | null;
  condition: string | null;
  branch_id: string;
  location_id: string | null;
  source: string;
  status: VehicleStatus;
  purchase_date: string | null;
  registration_date: string | null;
  registration_expiry: string | null;
  description: string | null;
  current_selling_price: number | null;
  make_id: string | null;
  model_id: string | null;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  branches?: { id: string; name: string } | { id: string; name: string }[] | null;
  branch_locations?: { id: string; name: string } | { id: string; name: string }[] | null;
};

function asRelation<T extends { id: string }>(
  value: T | T[] | null | undefined,
): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapListItem(row: VehicleRow): VehicleListItem {
  const branch = asRelation(row.branches);
  const location = asRelation(row.branch_locations);
  return {
    id: row.id,
    stockNumber: row.stock_number,
    vin: row.vin,
    chassisNumber: row.chassis_number,
    make: row.make,
    model: row.model,
    variant: row.variant,
    year: row.year,
    mileage: row.mileage,
    mileageUnit: row.mileage_unit,
    status: row.status,
    branchId: row.branch_id,
    branchName: branch?.name ?? null,
    locationId: row.location_id,
    locationName: location?.name ?? null,
    bodyType: row.body_type,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    originType: row.origin_type,
    exteriorColor: row.exterior_color,
    purchaseDate: row.purchase_date,
    currentSellingPrice: row.current_selling_price,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbError(error: { code?: string; message?: string }): VehicleServiceError {
  const message = (error.message ?? "").toLowerCase();
  if (error.code === "23505" || message.includes("vehicles_vin_active_unique")) {
    return { code: "duplicate_vin", message: "A vehicle with this VIN already exists." };
  }
  if (message.includes("vehicles_chassis_active_unique")) {
    return { code: "duplicate_chassis", message: "A vehicle with this chassis number already exists." };
  }
  if (message.includes("invalid vehicle status transition")) {
    return { code: "invalid_transition", message: "That status change is not allowed." };
  }
  if (message.includes("override not authorized")) {
    return { code: "forbidden", message: "You do not have permission to override Ready for Sale checks." };
  }
  if (message.includes("not authorized for branch")) {
    return { code: "forbidden", message: "You do not have access to this vehicle branch." };
  }
  if (message.includes("not authorized") || message.includes("permission")) {
    return { code: "forbidden", message: "You do not have permission to perform this action." };
  }
  if (message.includes("location does not belong") || message.includes("invalid location")) {
    return { code: "validation", message: "Selected location is not valid for this branch." };
  }
  if (message.includes("cannot be transferred") || message.includes("cannot be archived")) {
    return { code: "conflict", message: error.message ?? "This action is not allowed for the vehicle." };
  }
  if (message.includes("reason required") || message.includes("override reason required")) {
    return { code: "validation", message: "A reason is required." };
  }
  if (message.includes("vehicle not found")) {
    return { code: "not_found", message: "Vehicle not found." };
  }
  if (message.includes("not eligible for ready_for_sale")) {
    return {
      code: "not_eligible",
      message: "Vehicle cannot be marked Ready for Sale.",
      blockers: extractReadyForSaleBlockers(error.message ?? ""),
    };
  }
  if (message.includes("already ready for sale")) {
    return { code: "conflict", message: "Vehicle is already Ready for Sale." };
  }
  if (message.includes("use mark_vehicle_ready_for_sale")) {
    return {
      code: "invalid_transition",
      message: "Use Mark Ready for Sale to move this vehicle to Ready for Sale.",
    };
  }
  return { code: "unknown", message: "Unable to complete the request. Please try again." };
}

function extractReadyForSaleBlockers(message: string): unknown {
  const marker = "vehicle not eligible for ready_for_sale: ";
  const index = message.toLowerCase().indexOf(marker);
  if (index < 0) return undefined;
  const raw = message.slice(index + marker.length).trim();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function formToInsert(values: CreateVehicleValues, userId: string) {
  return {
    vin: values.vin,
    chassis_number: values.chassisNumber,
    make: values.make,
    model: values.model,
    variant: values.variant,
    year: values.year,
    mileage: values.mileage,
    mileage_unit: values.mileageUnit,
    body_type: values.bodyType,
    transmission: values.transmission ?? null,
    fuel_type: values.fuelType ?? null,
    engine_size: values.engineSize,
    engine_cylinders: values.engineCylinders,
    drive_type: values.driveType ?? null,
    seats: values.seats,
    doors: values.doors,
    exterior_color: values.exteriorColor,
    interior_color: values.interiorColor,
    origin_type: values.originType ?? null,
    country_of_origin: values.countryOfOrigin,
    branch_id: values.branchId,
    location_id: values.locationId,
    purchase_date: values.purchaseDate,
    registration_date: values.registrationDate,
    description: values.description,
    make_id: values.makeId,
    model_id: values.modelId,
    status: "acquired" as const,
    source: "other" as const,
    created_by: userId,
    updated_by: userId,
  };
}

const LIST_SELECT = `
  id, stock_number, vin, chassis_number, make, model, variant, year, mileage, mileage_unit,
  exterior_color, interior_color, body_type, transmission, fuel_type, engine_size, engine_cylinders,
  seats, doors, drive_type, origin_type, country_of_origin, condition, branch_id, location_id,
  source, status, purchase_date, registration_date, registration_expiry, description,
  current_selling_price, make_id, model_id, archived_at, created_by, updated_by, created_at, updated_at, deleted_at,
  branches:branch_id ( id, name ),
  branch_locations:location_id ( id, name )
`;

export async function listVehicles(
  query: VehicleListQuery,
): Promise<ServiceResult<VehicleListResult>> {
  const supabase = await createClient();

  let builder = supabase
    .from("vehicles")
    .select(LIST_SELECT, { count: "exact" })
    .is("deleted_at", null);

  if (!query.includeArchived) {
    builder = builder.neq("status", "archived");
  }

  if (query.status) builder = builder.eq("status", query.status);
  if (query.branchId) builder = builder.eq("branch_id", query.branchId);
  if (query.locationId) builder = builder.eq("location_id", query.locationId);
  if (query.make) builder = builder.ilike("make", `%${query.make}%`);
  if (query.model) builder = builder.ilike("model", `%${query.model}%`);
  if (query.bodyType) builder = builder.ilike("body_type", `%${query.bodyType}%`);
  if (query.originType) builder = builder.eq("origin_type", query.originType);
  if (query.fuelType) builder = builder.eq("fuel_type", query.fuelType);
  if (query.transmission) builder = builder.eq("transmission", query.transmission);
  if (query.yearFrom != null) builder = builder.gte("year", query.yearFrom);
  if (query.yearTo != null) builder = builder.lte("year", query.yearTo);
  if (query.mileageMin != null) builder = builder.gte("mileage", query.mileageMin);
  if (query.mileageMax != null) builder = builder.lte("mileage", query.mileageMax);
  if (query.purchaseDateFrom) builder = builder.gte("purchase_date", query.purchaseDateFrom);
  if (query.purchaseDateTo) builder = builder.lte("purchase_date", query.purchaseDateTo);

  if (query.q) {
    const q = query.q.replace(/[%_]/g, "");
    builder = builder.or(
      `stock_number.ilike.%${q}%,vin.ilike.%${q}%,chassis_number.ilike.%${q}%,make.ilike.%${q}%,model.ilike.%${q}%,variant.ilike.%${q}%`,
    );
  }

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  const { data, error, count } = await builder
    .order(query.sort, { ascending: query.order === "asc" })
    .range(from, to);

  if (error) {
    return { data: null, error: mapDbError(error) };
  }

  const summary = await getInventorySummary();

  const items = ((data ?? []) as unknown as VehicleRow[]).map(mapListItem);
  const primaryUrls = await getPrimaryPhotoUrls(items.map((item) => item.id));
  const withPhotos = items.map((item) => ({
    ...item,
    primaryPhotoUrl: primaryUrls.get(item.id) ?? null,
  }));

  return {
    data: {
      items: withPhotos,
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
      summary: summary.data ?? {
        total: 0,
        readyForSale: 0,
        underInspection: 0,
        underRepair: 0,
        reserved: 0,
        sold: 0,
      },
    },
    error: null,
  };
}

export async function getInventorySummary(): Promise<ServiceResult<InventorySummary>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("status")
    .is("deleted_at", null)
    .neq("status", "archived");

  if (error) return { data: null, error: mapDbError(error) };

  const rows = (data ?? []) as { status: VehicleStatus }[];
  const summary: InventorySummary = {
    total: rows.length,
    readyForSale: 0,
    underInspection: 0,
    underRepair: 0,
    reserved: 0,
    sold: 0,
  };

  for (const row of rows) {
    if (row.status === "ready_for_sale") summary.readyForSale += 1;
    if (row.status === "under_inspection") summary.underInspection += 1;
    if (row.status === "under_repair") summary.underRepair += 1;
    if (row.status === "reserved") summary.reserved += 1;
    if (row.status === "sold" || row.status === "delivered") summary.sold += 1;
  }

  return { data: summary, error: null };
}

export async function findDuplicateVehicle(input: {
  vin?: string | null;
  chassisNumber?: string | null;
  excludeId?: string;
}): Promise<ServiceResult<{ id: string; stockNumber: string } | null>> {
  const supabase = await createClient();

  if (input.vin) {
    let q = supabase
      .from("vehicles")
      .select("id, stock_number")
      .eq("vin", input.vin)
      .is("deleted_at", null)
      .limit(1);
    if (input.excludeId) q = q.neq("id", input.excludeId);
    const { data, error } = await q.maybeSingle();
    if (error) return { data: null, error: mapDbError(error) };
    if (data) {
      const row = data as { id: string; stock_number: string };
      return { data: { id: row.id, stockNumber: row.stock_number }, error: null };
    }
  }

  if (input.chassisNumber) {
    let q = supabase
      .from("vehicles")
      .select("id, stock_number")
      .eq("chassis_number", input.chassisNumber)
      .is("deleted_at", null)
      .limit(1);
    if (input.excludeId) q = q.neq("id", input.excludeId);
    const { data, error } = await q.maybeSingle();
    if (error) return { data: null, error: mapDbError(error) };
    if (data) {
      const row = data as { id: string; stock_number: string };
      return { data: { id: row.id, stockNumber: row.stock_number }, error: null };
    }
  }

  return { data: null, error: null };
}

export async function getVehicle(
  id: string,
  context: UserContext,
): Promise<ServiceResult<VehicleDetail>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(LIST_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: mapDbError(error) };
  if (!data) return { data: null, error: { code: "not_found", message: "Vehicle not found." } };

  const row = data as unknown as VehicleRow;
  const base = mapListItem(row);

  let createdByName: string | null = null;
  let updatedByName: string | null = null;
  const profileIds = [row.created_by, row.updated_by].filter(Boolean) as string[];
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", profileIds);
    const map = new Map(
      ((profiles ?? []) as { id: string; display_name: string }[]).map((p) => [
        p.id,
        p.display_name,
      ]),
    );
    createdByName = row.created_by ? (map.get(row.created_by) ?? null) : null;
    updatedByName = row.updated_by ? (map.get(row.updated_by) ?? null) : null;
  }

  const detail: VehicleDetail = {
    ...base,
    engineSize: row.engine_size,
    engineCylinders: row.engine_cylinders,
    seats: row.seats,
    doors: row.doors,
    driveType: row.drive_type,
    interiorColor: row.interior_color,
    countryOfOrigin: row.country_of_origin,
    registrationDate: row.registration_date,
    registrationExpiry: row.registration_expiry,
    description: row.description,
    source: row.source,
    condition: row.condition,
    makeId: row.make_id,
    modelId: row.model_id,
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdByName,
    updatedByName,
  };

  if (hasPermission(context.permissions, "vehicle.cost.view", context.roles)) {
    const { data: costs } = await supabase.rpc("read_vehicle_costs", {
      p_vehicle_id: id,
    });
    const costRow = Array.isArray(costs) ? costs[0] : costs;
    if (costRow && typeof costRow === "object") {
      const record = costRow as {
        total_acquisition_cost?: number;
        minimum_selling_price?: number | null;
      };
      detail.totalAcquisitionCost = Number(record.total_acquisition_cost ?? 0);
      detail.minimumSellingPrice =
        record.minimum_selling_price == null ? null : Number(record.minimum_selling_price);
    }
  }

  if (hasPermission(context.permissions, "acquisition.view", context.roles)) {
    const { data: activeAcq } = await supabase
      .from("acquisitions")
      .select(
        "id, acquisition_number, status, source_type, purchase_date, purchase_price, currency",
      )
      .eq("vehicle_id", id)
      .not("status", "in", '("cancelled","rejected")')
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const acq =
      activeAcq ??
      (
        await supabase
          .from("acquisitions")
          .select(
            "id, acquisition_number, status, source_type, purchase_date, purchase_price, currency",
          )
          .eq("vehicle_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;

    if (acq) {
      const row = acq as {
        id: string;
        acquisition_number: string;
        status: string;
        source_type: string | null;
        purchase_date: string | null;
        purchase_price: number | null;
        currency: string;
      };
      detail.acquisition = {
        id: row.id,
        acquisitionNumber: row.acquisition_number,
        status: row.status,
        sourceType: row.source_type,
        purchaseDate: row.purchase_date,
        purchasePrice:
          row.purchase_price == null ? null : Number(row.purchase_price),
        currency: row.currency,
      };

      if (hasPermission(context.permissions, "acquisition.cost.view", context.roles) ||
          hasPermission(context.permissions, "vehicle.cost.view", context.roles)) {
        const { data: costs } = await supabase.rpc("read_acquisition_costs", {
          p_acquisition_id: row.id,
        });
        const costRow = Array.isArray(costs) ? costs[0] : costs;
        if (costRow && typeof costRow === "object") {
          const record = costRow as { total_acquisition_cost?: number };
          if (record.total_acquisition_cost != null) {
            detail.acquisition.totalAcquisitionCost = Number(record.total_acquisition_cost);
          }
        }
      }
    } else {
      detail.acquisition = null;
    }
  }

  return { data: detail, error: null };
}

export async function createVehicle(
  values: CreateVehicleValues,
  context: UserContext,
): Promise<ServiceResult<VehicleDetail>> {
  if (!hasPermission(context.permissions, "vehicle.create", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "You do not have permission to create vehicles." } };
  }

  const duplicate = await findDuplicateVehicle({
    vin: values.vin,
    chassisNumber: values.chassisNumber,
  });
  if (duplicate.error) return { data: null, error: duplicate.error };
  if (duplicate.data) {
    return {
      data: null,
      error: {
        code: values.vin ? "duplicate_vin" : "duplicate_chassis",
        message: values.vin
          ? "A vehicle with this VIN already exists."
          : "A vehicle with this chassis number already exists.",
        existingVehicleId: duplicate.data.id,
      },
    };
  }

  const supabase = await createClient();
  const insert = formToInsert(values, context.userId);
  // stock_number assigned by DB trigger
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...insert, stock_number: "" } as never)
    .select("id")
    .single();

  if (error) return { data: null, error: mapDbError(error) };
  const id = (data as { id: string }).id;
  return getVehicle(id, context);
}

export async function updateVehicle(
  id: string,
  values: UpdateVehicleValues,
  context: UserContext,
): Promise<ServiceResult<VehicleDetail>> {
  if (!hasPermission(context.permissions, "vehicle.edit", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "You do not have permission to edit vehicles." } };
  }

  const duplicate = await findDuplicateVehicle({
    vin: values.vin,
    chassisNumber: values.chassisNumber,
    excludeId: id,
  });
  if (duplicate.error) return { data: null, error: duplicate.error };
  if (duplicate.data) {
    return {
      data: null,
      error: {
        code: values.vin ? "duplicate_vin" : "duplicate_chassis",
        message: values.vin
          ? "A vehicle with this VIN already exists."
          : "A vehicle with this chassis number already exists.",
        existingVehicleId: duplicate.data.id,
      },
    };
  }

  const supabase = await createClient();
  const payload = {
    ...formToInsert(values, context.userId),
    status: undefined,
    source: undefined,
    created_by: undefined,
  };
  delete (payload as { status?: unknown }).status;
  delete (payload as { source?: unknown }).source;
  delete (payload as { created_by?: unknown }).created_by;

  // Branch moves go through transferVehicle. Location may change within the same branch.
  const { error } = await supabase
    .from("vehicles")
    .update({
      vin: values.vin,
      chassis_number: values.chassisNumber,
      make: values.make,
      model: values.model,
      variant: values.variant,
      year: values.year,
      mileage: values.mileage,
      mileage_unit: values.mileageUnit,
      body_type: values.bodyType,
      transmission: values.transmission ?? null,
      fuel_type: values.fuelType ?? null,
      engine_size: values.engineSize,
      engine_cylinders: values.engineCylinders,
      drive_type: values.driveType ?? null,
      seats: values.seats,
      doors: values.doors,
      exterior_color: values.exteriorColor,
      interior_color: values.interiorColor,
      origin_type: values.originType ?? null,
      country_of_origin: values.countryOfOrigin,
      location_id: values.locationId,
      purchase_date: values.purchaseDate,
      registration_date: values.registrationDate,
      description: values.description,
      make_id: values.makeId,
      model_id: values.modelId,
      updated_by: context.userId,
    } as never)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { data: null, error: mapDbError(error) };
  return getVehicle(id, context);
}

export async function changeVehicleStatus(
  id: string,
  values: ChangeVehicleStatusValues,
  context: UserContext,
): Promise<ServiceResult<VehicleDetail>> {
  const canChange =
    hasPermission(context.permissions, "vehicle.status.change", context.roles) ||
    hasPermission(context.permissions, "vehicle.edit", context.roles);
  if (!canChange) {
    return { data: null, error: { code: "forbidden", message: "You do not have permission to change status." } };
  }

  const current = await getVehicle(id, context);
  if (current.error || !current.data) return current;

  if (!isValidVehicleStatusTransition(current.data.status, values.status)) {
    return {
      data: null,
      error: { code: "invalid_transition", message: "That status change is not allowed." },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_vehicle_status", {
    p_vehicle_id: id,
    p_new_status: values.status,
    p_reason: values.reason,
  } as never);

  if (error) return { data: null, error: mapDbError(error) };
  return getVehicle(id, context);
}

export async function transferVehicle(
  id: string,
  values: TransferVehicleValues,
  context: UserContext,
): Promise<ServiceResult<VehicleDetail>> {
  const canTransfer =
    hasPermission(context.permissions, "vehicle.branch.transfer", context.roles) ||
    hasPermission(context.permissions, "vehicle.edit", context.roles);
  if (!canTransfer) {
    return { data: null, error: { code: "forbidden", message: "You do not have permission to transfer vehicles." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_vehicle", {
    p_vehicle_id: id,
    p_branch_id: values.branchId,
    p_location_id: values.locationId,
    p_reason: values.reason,
  } as never);

  if (error) return { data: null, error: mapDbError(error) };
  return getVehicle(id, context);
}

export async function archiveVehicle(
  id: string,
  values: ArchiveVehicleValues,
  context: UserContext,
): Promise<ServiceResult<VehicleDetail>> {
  const canArchive =
    hasPermission(context.permissions, "vehicle.archive", context.roles) ||
    hasPermission(context.permissions, "vehicle.delete", context.roles);
  if (!canArchive) {
    return { data: null, error: { code: "forbidden", message: "You do not have permission to archive vehicles." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_vehicle", {
    p_vehicle_id: id,
    p_reason: values.reason,
  } as never);

  if (error) return { data: null, error: mapDbError(error) };
  return getVehicle(id, context);
}

function mapReadyForSaleEligibility(raw: Record<string, unknown>): ReadyForSaleEligibility {
  const inspectionRaw = raw.inspection as Record<string, unknown> | null | undefined;
  const summaryRaw = (raw.summary ?? {}) as Record<string, unknown>;
  const checksRaw = Array.isArray(raw.checks) ? raw.checks : [];
  const blockersRaw = Array.isArray(raw.blockers) ? raw.blockers : [];

  const mapAction = (value: unknown): ReadyForSaleAction => {
    if (
      value === "view_inspection" ||
      value === "create_inspection" ||
      value === "view_documents"
    ) {
      return value;
    }
    return null;
  };

  const workshopCheckKeys = new Set(["workshop", "quality_check"]);
  const workshopBlockerPrefixes = ["workshop", "quality_check", "active_workshop", "pending_workshop"];

  const checks = checksRaw
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        key: String(row.key ?? ""),
        ok: Boolean(row.ok),
        label: String(row.label ?? ""),
      };
    })
    .filter((check) => !workshopCheckKeys.has(check.key));

  const blockers = blockersRaw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const code = String(row.code ?? "");
      const blocker: ReadyForSaleBlocker = {
        code,
        message: String(row.message ?? ""),
        action: mapAction(row.action),
      };
      if (row.inspection_id) blocker.inspectionId = String(row.inspection_id);
      return blocker;
    })
    .filter(
      (blocker) =>
        !workshopBlockerPrefixes.some(
          (prefix) => blocker.code === prefix || blocker.code.startsWith(`${prefix}_`),
        ),
    );

  // Client treats workshop as not required even if legacy API still returns blockers.
  const nonWorkshopEligible =
    Boolean(raw.eligible) ||
    (checks.every((check) => check.ok) && blockers.length === 0);

  return {
    eligible: nonWorkshopEligible,
    canOverride: Boolean(raw.canOverride),
    vehicleId: String(raw.vehicleId ?? ""),
    stockNumber: String(raw.stockNumber ?? ""),
    make: String(raw.make ?? ""),
    model: String(raw.model ?? ""),
    year: Number(raw.year ?? 0),
    currentStatus: raw.currentStatus as VehicleStatus,
    inspection: inspectionRaw
      ? {
          id: String(inspectionRaw.id),
          inspectionNumber: String(inspectionRaw.inspectionNumber ?? ""),
          result: (inspectionRaw.result as InspectionResult | null) ?? null,
          approvedAt: (inspectionRaw.approvedAt as string | null) ?? null,
          completedAt: (inspectionRaw.completedAt as string | null) ?? null,
          expired: Boolean(inspectionRaw.expired),
          repairsRequired: Boolean(inspectionRaw.repairsRequired),
        }
      : null,
    workshop: {
      required: false,
      orderId: null,
      orderNumber: null,
      status: null,
      qualityResult: null,
      activeOrders: 0,
      pendingJobs: 0,
    },
    checks,
    blockers,
    summary: {
      inspection: String(summaryRaw.inspection ?? "missing"),
      workshop: "not_required",
    },
    error: raw.error ? String(raw.error) : undefined,
  };
}

export async function getVehicleReadyForSaleEligibility(
  id: string,
  context: UserContext,
): Promise<ServiceResult<ReadyForSaleEligibility>> {
  const canView =
    hasPermission(context.permissions, "vehicle.ready_for_sale", context.roles) ||
    hasPermission(context.permissions, "vehicle.view", context.roles);
  if (!canView) {
    return {
      data: null,
      error: { code: "forbidden", message: "You do not have permission to view Ready for Sale eligibility." },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("evaluate_vehicle_ready_for_sale", {
    p_vehicle_id: id,
  });

  if (error) return { data: null, error: mapDbError(error) };
  return {
    data: mapReadyForSaleEligibility((data ?? {}) as Record<string, unknown>),
    error: null,
  };
}

export async function markVehicleReadyForSale(
  id: string,
  values: MarkReadyForSaleValues,
  context: UserContext,
): Promise<ServiceResult<VehicleDetail>> {
  if (!hasPermission(context.permissions, "vehicle.ready_for_sale", context.roles)) {
    return {
      data: null,
      error: { code: "forbidden", message: "You do not have permission to mark vehicles Ready for Sale." },
    };
  }

  if (
    values.override &&
    !hasPermission(context.permissions, "vehicle.ready_for_sale.override", context.roles)
  ) {
    return {
      data: null,
      error: {
        code: "forbidden",
        message: "You do not have permission to override Ready for Sale checks.",
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_vehicle_ready_for_sale", {
    p_vehicle_id: id,
    p_reason: values.reason,
    p_override: values.override ?? false,
    p_override_reason: values.overrideReason,
  });

  if (error) return { data: null, error: mapDbError(error) };
  return getVehicle(id, context);
}

export async function getVehicleStatusHistory(
  vehicleId: string,
): Promise<ServiceResult<VehicleStatusHistoryItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_status_history")
    .select("id, vehicle_id, old_status, new_status, reason, changed_by, created_at")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: mapDbError(error) };

  const rows = (data ?? []) as {
    id: string;
    vehicle_id: string;
    old_status: VehicleStatus | null;
    new_status: VehicleStatus;
    reason: string | null;
    changed_by: string | null;
    created_at: string;
  }[];

  const userIds = Array.from(new Set(rows.map((r) => r.changed_by).filter(Boolean))) as string[];
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    for (const profile of (profiles ?? []) as { id: string; display_name: string }[]) {
      nameMap.set(profile.id, profile.display_name);
    }
  }

  return {
    data: rows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      reason: row.reason,
      changedBy: row.changed_by,
      changedByName: row.changed_by ? (nameMap.get(row.changed_by) ?? null) : null,
      createdAt: row.created_at,
    })),
    error: null,
  };
}

export async function getVehicleActivity(
  vehicleId: string,
): Promise<ServiceResult<VehicleActivityItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, old_values, new_values, metadata, created_at, user_id")
    .eq("entity_type", "vehicles")
    .eq("entity_id", vehicleId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { data: null, error: mapDbError(error) };

  const rows = (data ?? []) as {
    id: string;
    action: string;
    entity_type: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    user_id: string | null;
  }[];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    for (const profile of (profiles ?? []) as { id: string; display_name: string }[]) {
      nameMap.set(profile.id, profile.display_name);
    }
  }

  return {
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      oldValues: row.old_values,
      newValues: row.new_values,
      metadata: row.metadata,
      createdAt: row.created_at,
      userId: row.user_id,
      userName: row.user_id ? (nameMap.get(row.user_id) ?? null) : null,
    })),
    error: null,
  };
}

export async function listBranches(): Promise<ServiceResult<BranchOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (error) return { data: null, error: mapDbError(error) };
  return {
    data: ((data ?? []) as { id: string; name: string; code: string }[]).map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
    })),
    error: null,
  };
}

export async function listLocations(
  branchId?: string,
): Promise<ServiceResult<LocationOption[]>> {
  const supabase = await createClient();
  let q = supabase
    .from("branch_locations")
    .select("id, branch_id, name, location_type")
    .eq("is_active", true)
    .order("name");
  if (branchId) q = q.eq("branch_id", branchId);

  const { data, error } = await q;
  if (error) return { data: null, error: mapDbError(error) };
  return {
    data: ((data ?? []) as {
      id: string;
      branch_id: string;
      name: string;
      location_type: string;
    }[]).map((row) => ({
      id: row.id,
      branchId: row.branch_id,
      name: row.name,
      locationType: row.location_type,
    })),
    error: null,
  };
}

export async function listMakes(): Promise<ServiceResult<MakeOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_makes")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error) return { data: null, error: mapDbError(error) };
  return {
    data: ((data ?? []) as { id: string; name: string }[]).map((row) => ({
      id: row.id,
      name: row.name,
    })),
    error: null,
  };
}

export async function listModels(makeId?: string): Promise<ServiceResult<ModelOption[]>> {
  const supabase = await createClient();
  let q = supabase
    .from("vehicle_models")
    .select("id, make_id, name")
    .eq("is_active", true)
    .order("name");
  if (makeId) q = q.eq("make_id", makeId);

  const { data, error } = await q;
  if (error) return { data: null, error: mapDbError(error) };
  return {
    data: ((data ?? []) as { id: string; make_id: string; name: string }[]).map((row) => ({
      id: row.id,
      makeId: row.make_id,
      name: row.name,
    })),
    error: null,
  };
}
