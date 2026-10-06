import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import {
  canAssignInspection,
  canEditInspectionChecklist,
  canSubmitInspection,
  isInspectionLocked,
  isValidInspectionStatusTransition,
} from "@/lib/inspections/status-transitions";
import type { UserContext } from "@/types/auth";
import type { Json } from "@/types/database";
import type {
  InspectionActivityItem,
  InspectionDetail,
  InspectionFinding,
  InspectionItem,
  InspectionItemResult,
  InspectionListItem,
  InspectionListResult,
  InspectionMeta,
  InspectionPhoto,
  InspectionProgress,
  InspectionRecommendationRow,
  InspectionSection,
  InspectionSeverity,
  InspectionStatus,
  InspectionStatusHistoryItem,
  InspectionSummary,
  VehicleInspectionSummary,
} from "@/types/inspection";
import {
  INSPECTION_DAMAGE_LOCATIONS,
  INSPECTION_DAMAGE_TYPES,
  INSPECTION_ITEM_RESULTS,
  INSPECTION_PHOTO_CATEGORIES,
  INSPECTION_RECOMMENDATIONS,
  INSPECTION_RESULTS,
  INSPECTION_SEVERITIES,
  INSPECTION_SORT_FIELDS,
  INSPECTION_STATUSES,
  INSPECTION_TYPES,
} from "@/types/inspection";
import type {
  ApproveInspectionValues,
  AssignInspectionValues,
  CancelInspectionValues,
  ChangeInspectionStatusValues,
  CreateInspectionValues,
  InspectionFindingValues,
  InspectionListQuery,
  InspectionPhotoValues,
  RejectInspectionValues,
  ReinspectValues,
  SaveInspectionDraftValues,
  SubmitInspectionValues,
  UpdateInspectionFindingValues,
  UpdateInspectionOutcomeValues,
  UpdateInspectionValues,
} from "@/lib/validation/inspection";

export type InspectionServiceError = {
  code:
    | "not_found"
    | "forbidden"
    | "invalid_transition"
    | "validation"
    | "conflict"
    | "unknown";
  message: string;
};

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: InspectionServiceError };

type InspectionRow = {
  id: string;
  inspection_number: string;
  inspection_type: InspectionListItem["inspectionType"];
  status: InspectionStatus;
  result: InspectionListItem["result"];
  overall_score: number | null;
  branch_id: string;
  vehicle_id: string;
  template_id: string | null;
  assigned_to: string | null;
  inspected_by: string | null;
  inspector_id: string | null;
  parent_inspection_id: string | null;
  odometer_reading: number | null;
  odometer_unit: string;
  summary: string | null;
  recommendation: InspectionDetail["recommendation"];
  notes: string | null;
  vin_verified: boolean | null;
  vin_mismatch: boolean | null;
  verified_vin: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  review_note: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: { id: string; name: string } | { id: string; name: string }[] | null;
  vehicles?:
    | {
        id: string;
        stock_number: string;
        vin: string | null;
        make: string;
        model: string;
        year: number;
        mileage: number;
      }
    | {
        id: string;
        stock_number: string;
        vin: string | null;
        make: string;
        model: string;
        year: number;
        mileage: number;
      }[]
    | null;
  inspection_templates?:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

type SectionRow = {
  id: string;
  inspection_id: string;
  section_key: string;
  name: string;
  sort_order: number;
  is_required: boolean;
  is_completed: boolean;
  notes: string | null;
};

type ItemRow = {
  id: string;
  inspection_id: string;
  section_id: string | null;
  section_key: string | null;
  template_item_id: string | null;
  name: string;
  category: string;
  sort_order: number;
  is_required: boolean;
  result: InspectionItemResult | null;
  severity: InspectionSeverity | null;
  notes: string | null;
};

type FindingRow = {
  id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  section_id: string | null;
  result: InspectionItemResult;
  severity: InspectionSeverity;
  title: string;
  description: string | null;
  recommended_action: string | null;
  recommendation: InspectionFinding["recommendation"];
  currency: string;
  damage_type: InspectionFinding["damageType"];
  damage_location: InspectionFinding["damageLocation"];
  is_critical: boolean;
  is_resolved: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type PhotoRow = {
  id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  section_id: string | null;
  finding_id: string | null;
  category: InspectionPhoto["category"];
  storage_path: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type RecommendationRow = {
  id: string;
  inspection_id: string;
  finding_id: string | null;
  recommendation: InspectionRecommendationRow["recommendation"];
  priority: string | null;
  notes: string | null;
  currency: string;
  created_by: string | null;
  created_at: string;
};

type CostRpcRow = {
  finding_id: string | null;
  finding_title: string | null;
  finding_estimated_cost: number | null;
  recommendation_id: string | null;
  recommendation_estimated_cost: number | null;
  currency: string | null;
  findings_total: number | null;
  recommendations_total: number | null;
};

const SORT_FIELD_SET = new Set<string>(INSPECTION_SORT_FIELDS);

const LIST_SELECT = `
  id, inspection_number, inspection_type, status, result, overall_score,
  branch_id, vehicle_id, template_id, assigned_to, inspected_by, inspector_id,
  parent_inspection_id, odometer_reading, odometer_unit, summary, recommendation, notes,
  vin_verified, vin_mismatch, verified_vin,
  assigned_at, assigned_by, reviewed_by, reviewed_at, approved_at,
  rejection_reason, review_note, cancel_reason, cancelled_at,
  started_at, submitted_at, created_by, updated_by, created_at, updated_at,
  branches:branch_id ( id, name ),
  vehicles:vehicle_id ( id, stock_number, vin, make, model, year, mileage ),
  inspection_templates:template_id ( id, name )
`;

function asRelation<T extends { id: string }>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapDbError(error: { code?: string; message?: string }): InspectionServiceError {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("invalid inspection status transition")) {
    return { code: "invalid_transition", message: "That status change is not allowed." };
  }
  if (message.includes("self approval")) {
    return { code: "forbidden", message: "Inspection approval was denied." };
  }
  if (message.includes("not authorized") || message.includes("permission")) {
    return { code: "forbidden", message: "You do not have permission to perform this action." };
  }
  if (message.includes("inspection not found") || message.includes("assignee not found")) {
    return { code: "not_found", message: "Inspection not found." };
  }
  if (
    message.includes("reason required") ||
    message.includes("rejection reason") ||
    message.includes("assigned_to required")
  ) {
    return { code: "validation", message: "A reason is required." };
  }
  if (
    message.includes("must be in_progress") ||
    message.includes("not under review") ||
    message.includes("cannot be") ||
    message.includes("incomplete") ||
    message.includes("critical findings") ||
    message.includes("has no template") ||
    message.includes("use dedicated") ||
    message.includes("reinspection not allowed") ||
    message.includes("overall_score")
  ) {
    return { code: "conflict", message: error.message ?? "This action is not allowed." };
  }
  return { code: "unknown", message: "Unable to complete the request. Please try again." };
}

function canAccessBranch(context: UserContext, branchId: string) {
  if (context.branchScope === "ALL_BRANCHES") return true;
  return context.accessibleBranchIds.includes(branchId);
}

function canViewCosts(context: UserContext) {
  return hasPermission(context.permissions, "inspection.cost.view", context.roles);
}

function mapListItem(
  row: InspectionRow,
  counts?: { critical: number; failed: number },
  names?: Map<string, string>,
): InspectionListItem {
  const branch = asRelation(row.branches);
  const vehicle = asRelation(row.vehicles);
  return {
    id: row.id,
    inspectionNumber: row.inspection_number,
    inspectionType: row.inspection_type,
    status: row.status,
    result: row.result,
    overallScore: row.overall_score == null ? null : Number(row.overall_score),
    branchId: row.branch_id,
    branchName: branch?.name ?? null,
    vehicleId: row.vehicle_id,
    vehicleStockNumber: vehicle?.stock_number ?? null,
    vehicleMake: vehicle?.make ?? null,
    vehicleModel: vehicle?.model ?? null,
    vehicleYear: vehicle?.year ?? null,
    vehicleVin: vehicle?.vin ?? null,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to ? (names?.get(row.assigned_to) ?? null) : null,
    inspectedBy: row.inspected_by,
    inspectedByName: row.inspected_by ? (names?.get(row.inspected_by) ?? null) : null,
    parentInspectionId: row.parent_inspection_id,
    criticalFindingsCount: counts?.critical ?? 0,
    failedItemsCount: counts?.failed ?? 0,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSection(row: SectionRow, itemStats?: { completed: number; total: number }): InspectionSection {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    sectionKey: row.section_key,
    name: row.name,
    sortOrder: row.sort_order,
    isRequired: row.is_required,
    isCompleted: row.is_completed,
    notes: row.notes,
    itemsCompleted: itemStats?.completed ?? 0,
    itemsTotal: itemStats?.total ?? 0,
  };
}

function mapItem(row: ItemRow): InspectionItem {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    sectionId: row.section_id,
    sectionKey: row.section_key,
    templateItemId: row.template_item_id,
    name: row.name,
    category: row.category,
    sortOrder: row.sort_order,
    isRequired: row.is_required,
    result: row.result,
    severity: row.severity,
    notes: row.notes,
  };
}

function mapFinding(
  row: FindingRow,
  names?: Map<string, string>,
  estimatedCost?: number | null,
): InspectionFinding {
  const finding: InspectionFinding = {
    id: row.id,
    inspectionId: row.inspection_id,
    inspectionItemId: row.inspection_item_id,
    sectionId: row.section_id,
    result: row.result,
    severity: row.severity,
    title: row.title,
    description: row.description,
    recommendedAction: row.recommended_action,
    recommendation: row.recommendation,
    currency: row.currency,
    damageType: row.damage_type,
    damageLocation: row.damage_location,
    isCritical: row.is_critical,
    isResolved: row.is_resolved,
    createdBy: row.created_by,
    createdByName: row.created_by ? (names?.get(row.created_by) ?? null) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (estimatedCost !== undefined) {
    finding.estimatedCost = estimatedCost;
  }
  return finding;
}

function mapPhoto(row: PhotoRow, names?: Map<string, string>, signedUrl?: string | null): InspectionPhoto {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    inspectionItemId: row.inspection_item_id,
    sectionId: row.section_id,
    findingId: row.finding_id,
    category: row.category,
    storagePath: row.storage_path,
    caption: row.caption,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by ? (names?.get(row.uploaded_by) ?? null) : null,
    createdAt: row.created_at,
    signedUrl: signedUrl ?? null,
  };
}

function mapRecommendation(
  row: RecommendationRow,
  estimatedCost?: number | null,
): InspectionRecommendationRow {
  const rec: InspectionRecommendationRow = {
    id: row.id,
    inspectionId: row.inspection_id,
    findingId: row.finding_id,
    recommendation: row.recommendation,
    priority: row.priority,
    notes: row.notes,
    currency: row.currency,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
  if (estimatedCost !== undefined) {
    rec.estimatedCost = estimatedCost;
  }
  return rec;
}

async function loadProfileNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: (string | null | undefined)[],
) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (unique.length === 0) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  return new Map(
    ((data ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
  );
}

async function loadListCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inspectionIds: string[],
) {
  const counts = new Map<string, { critical: number; failed: number }>();
  for (const id of inspectionIds) {
    counts.set(id, { critical: 0, failed: 0 });
  }
  if (inspectionIds.length === 0) return counts;

  const [{ data: findings }, { data: items }] = await Promise.all([
    supabase
      .from("inspection_findings")
      .select("inspection_id, severity, is_resolved")
      .in("inspection_id", inspectionIds)
      .eq("severity", "critical")
      .eq("is_resolved", false),
    supabase
      .from("inspection_items")
      .select("inspection_id, result")
      .in("inspection_id", inspectionIds)
      .eq("result", "fail"),
  ]);

  for (const row of (findings ?? []) as { inspection_id: string }[]) {
    const entry = counts.get(row.inspection_id) ?? { critical: 0, failed: 0 };
    entry.critical += 1;
    counts.set(row.inspection_id, entry);
  }
  for (const row of (items ?? []) as { inspection_id: string }[]) {
    const entry = counts.get(row.inspection_id) ?? { critical: 0, failed: 0 };
    entry.failed += 1;
    counts.set(row.inspection_id, entry);
  }
  return counts;
}

async function attachSignedUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photos: InspectionPhoto[],
) {
  if (photos.length === 0) return photos;
  return Promise.all(
    photos.map(async (photo) => {
      try {
        const { data } = await supabase.storage
          .from("inspection-photos")
          .createSignedUrl(photo.storagePath, 3600);
        return { ...photo, signedUrl: data?.signedUrl ?? null };
      } catch {
        return { ...photo, signedUrl: null };
      }
    }),
  );
}

async function loadCosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inspectionId: string,
  context: UserContext,
) {
  if (!canViewCosts(context)) {
    return {
      findingCosts: new Map<string, number | null>(),
      recommendationCosts: new Map<string, number | null>(),
      findingsTotal: null as number | null,
    };
  }

  const { data, error } = await supabase.rpc("read_inspection_costs", {
    p_inspection_id: inspectionId,
  });
  if (error || !data) {
    return {
      findingCosts: new Map<string, number | null>(),
      recommendationCosts: new Map<string, number | null>(),
      findingsTotal: null as number | null,
    };
  }

  const rows = data as unknown as CostRpcRow[];
  const findingCosts = new Map<string, number | null>();
  const recommendationCosts = new Map<string, number | null>();
  let findingsTotal: number | null = null;

  for (const row of rows) {
    if (row.finding_id) {
      findingCosts.set(
        row.finding_id,
        row.finding_estimated_cost == null ? null : Number(row.finding_estimated_cost),
      );
    }
    if (row.recommendation_id) {
      recommendationCosts.set(
        row.recommendation_id,
        row.recommendation_estimated_cost == null
          ? null
          : Number(row.recommendation_estimated_cost),
      );
    }
    if (row.findings_total != null) {
      findingsTotal = Number(row.findings_total);
    }
  }

  return { findingCosts, recommendationCosts, findingsTotal };
}

function buildProgress(
  sections: InspectionSection[],
  items: InspectionItem[],
  findings: InspectionFinding[],
  photosCount: number,
  estimatedRepairsTotal: number | null,
): InspectionProgress {
  const itemsCompleted = items.filter(
    (item) => item.result != null && item.result !== "not_tested",
  ).length;
  return {
    sectionsCompleted: sections.filter((s) => s.isCompleted).length,
    sectionsTotal: sections.length,
    itemsCompleted,
    itemsTotal: items.length,
    itemsRemaining: Math.max(items.length - itemsCompleted, 0),
    failedItems: items.filter((item) => item.result === "fail").length,
    advisoryItems: items.filter((item) => item.result === "advisory").length,
    criticalFindings: findings.filter((f) => f.isCritical && !f.isResolved).length,
    photosCount,
    estimatedRepairsTotal,
  };
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityId: string,
  oldValues: Json | null,
  newValues: Json | null,
  metadata: Json | null = null,
) {
  try {
    await supabase.rpc("write_audit_log", {
      p_action: action,
      p_entity_type: "inspections",
      p_entity_id: entityId,
      p_old_values: oldValues,
      p_new_values: newValues,
      p_metadata: metadata,
    });
  } catch {
    /* audit best-effort */
  }
}

type InspectionListFilterQuery = Partial<
  Pick<
    InspectionListQuery,
    | "status"
    | "inspectionType"
    | "result"
    | "branchId"
    | "assignedTo"
    | "inspectedBy"
    | "vehicleId"
    | "mine"
    | "repairRequired"
    | "dateFrom"
    | "dateTo"
    | "q"
    | "hasCritical"
  >
>;

async function resolveInspectionSearchVehicleIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  q: string | undefined,
): Promise<{ pattern: string; vehicleIds: string[] } | null> {
  if (!q) return null;
  const cleaned = q.replace(/[%_,()"]/g, "").trim();
  if (!cleaned) return null;

  // PostgREST requires quoted patterns when the value has hyphens / spaces.
  const pattern = `"%${cleaned}%"`;
  const { data: matchedVehicles } = await supabase
    .from("vehicles")
    .select("id")
    .or(
      `stock_number.ilike.${pattern},vin.ilike.${pattern},make.ilike.${pattern},model.ilike.${pattern}`,
    )
    .limit(200);

  return {
    pattern,
    vehicleIds: (matchedVehicles ?? []).map((row) => row.id as string),
  };
}

function applyInspectionListFilters<
  T extends {
    eq: Function;
    gte: Function;
    lte: Function;
    or: Function;
  },
>(
  builder: T,
  query: InspectionListFilterQuery,
  context: UserContext,
  search: { pattern: string; vehicleIds: string[] } | null,
): T {
  let next = builder;

  if (query.status) next = next.eq("status", query.status) as T;
  if (query.inspectionType) next = next.eq("inspection_type", query.inspectionType) as T;
  if (query.result) next = next.eq("result", query.result) as T;
  if (query.branchId) next = next.eq("branch_id", query.branchId) as T;
  if (query.assignedTo) next = next.eq("assigned_to", query.assignedTo) as T;
  if (query.inspectedBy) next = next.eq("inspected_by", query.inspectedBy) as T;
  if (query.vehicleId) next = next.eq("vehicle_id", query.vehicleId) as T;
  if (query.mine) {
    next = next.or(
      `assigned_to.eq.${context.userId},inspected_by.eq.${context.userId}`,
    ) as T;
  }
  if (query.repairRequired) next = next.eq("result", "repair_required") as T;
  if (query.dateFrom) next = next.gte("created_at", query.dateFrom) as T;
  if (query.dateTo) next = next.lte("created_at", `${query.dateTo}T23:59:59.999Z`) as T;

  if (search) {
    const filters = [`inspection_number.ilike.${search.pattern}`];
    if (search.vehicleIds.length > 0) {
      filters.push(`vehicle_id.in.(${search.vehicleIds.join(",")})`);
    }
    next = next.or(filters.join(",")) as T;
  }

  return next;
}

function buildInspectionSummary(
  rows: {
    id: string;
    status: InspectionStatus;
    assigned_to: string | null;
    inspected_by: string | null;
  }[],
  context: UserContext,
  criticalFindings: number,
): InspectionSummary {
  const summary: InspectionSummary = {
    pending: 0,
    myInspections: 0,
    inProgress: 0,
    awaitingReview: 0,
    approved: 0,
    rejected: 0,
    criticalFindings,
    total: rows.length,
  };

  for (const row of rows) {
    if (row.status === "draft" || row.status === "assigned") summary.pending += 1;
    if (row.status === "in_progress") summary.inProgress += 1;
    if (row.status === "submitted" || row.status === "under_review") summary.awaitingReview += 1;
    if (row.status === "approved") summary.approved += 1;
    if (row.status === "rejected") summary.rejected += 1;
    if (row.assigned_to === context.userId || row.inspected_by === context.userId) {
      summary.myInspections += 1;
    }
  }

  return summary;
}

export async function getInspectionSummary(
  context: UserContext,
  query: InspectionListFilterQuery = {},
): Promise<ServiceResult<InspectionSummary>> {
  const supabase = await createClient();
  const search = await resolveInspectionSearchVehicleIds(supabase, query.q);
  let builder = supabase
    .from("inspections")
    .select("id, status, assigned_to, inspected_by");

  builder = applyInspectionListFilters(builder, query, context, search);

  const { data, error } = await builder;
  if (error) return { data: null, error: mapDbError(error) };

  let rows = (data ?? []) as {
    id: string;
    status: InspectionStatus;
    assigned_to: string | null;
    inspected_by: string | null;
  }[];

  const ids = rows.map((row) => row.id);
  let criticalByInspection = new Map<string, number>();

  if (ids.length > 0) {
    const { data: critical } = await supabase
      .from("inspection_findings")
      .select("inspection_id")
      .in("inspection_id", ids)
      .eq("severity", "critical")
      .eq("is_resolved", false);

    for (const row of critical ?? []) {
      const inspectionId = (row as { inspection_id: string }).inspection_id;
      criticalByInspection.set(
        inspectionId,
        (criticalByInspection.get(inspectionId) ?? 0) + 1,
      );
    }
  }

  if (query.hasCritical === true) {
    rows = rows.filter((row) => (criticalByInspection.get(row.id) ?? 0) > 0);
  } else if (query.hasCritical === false) {
    rows = rows.filter((row) => (criticalByInspection.get(row.id) ?? 0) === 0);
  }

  const criticalFindings = rows.reduce(
    (sum, row) => sum + (criticalByInspection.get(row.id) ?? 0),
    0,
  );

  return {
    data: buildInspectionSummary(rows, context, criticalFindings),
    error: null,
  };
}

export async function listInspections(
  query: InspectionListQuery,
  context: UserContext,
): Promise<ServiceResult<InspectionListResult>> {
  const supabase = await createClient();

  const sort = SORT_FIELD_SET.has(query.sort) ? query.sort : "updated_at";
  const search = await resolveInspectionSearchVehicleIds(supabase, query.q);

  let builder = supabase.from("inspections").select(LIST_SELECT, { count: "exact" });
  builder = applyInspectionListFilters(builder, query, context, search);

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  const { data, error, count } = await builder
    .order(sort, { ascending: query.order === "asc" })
    .range(from, to);

  if (error) return { data: null, error: mapDbError(error) };

  const rows = (data ?? []) as unknown as InspectionRow[];
  const counts = await loadListCounts(
    supabase,
    rows.map((r) => r.id),
  );

  const names = await loadProfileNames(
    supabase,
    rows.flatMap((r) => [r.assigned_to, r.inspected_by]),
  );

  let items = rows.map((row) => mapListItem(row, counts.get(row.id), names));

  if (query.hasCritical === true) {
    items = items.filter((item) => item.criticalFindingsCount > 0);
  } else if (query.hasCritical === false) {
    items = items.filter((item) => item.criticalFindingsCount === 0);
  }

  const summary = await getInspectionSummary(context, query);

  return {
    data: {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
      summary: summary.data ?? {
        pending: 0,
        myInspections: 0,
        inProgress: 0,
        awaitingReview: 0,
        approved: 0,
        rejected: 0,
        criticalFindings: 0,
        total: 0,
      },
    },
    error: null,
  };
}

export async function getInspection(
  id: string,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .select(LIST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error: mapDbError(error) };
  if (!data) {
    return { data: null, error: { code: "not_found", message: "Inspection not found." } };
  }

  const row = data as unknown as InspectionRow;
  const vehicle = asRelation(row.vehicles);
  const template = asRelation(row.inspection_templates);

  const [
    { data: sectionRows },
    { data: itemRows },
    { data: findingRows },
    { data: photoRows },
    { data: recommendationRows },
  ] = await Promise.all([
    supabase
      .from("inspection_sections")
      .select(
        "id, inspection_id, section_key, name, sort_order, is_required, is_completed, notes",
      )
      .eq("inspection_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("inspection_items")
      .select(
        "id, inspection_id, section_id, section_key, template_item_id, name, category, sort_order, is_required, result, severity, notes",
      )
      .eq("inspection_id", id)
      .order("sort_order", { ascending: true }),
    hasPermission(context.permissions, "inspection.finding.view", context.roles) ||
    hasPermission(context.permissions, "inspection.view", context.roles)
      ? supabase
          .from("inspection_findings")
          .select(
            "id, inspection_id, inspection_item_id, section_id, result, severity, title, description, recommended_action, recommendation, currency, damage_type, damage_location, is_critical, is_resolved, created_by, created_at, updated_at",
          )
          .eq("inspection_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as FindingRow[] }),
    hasPermission(context.permissions, "inspection.photo.view", context.roles) ||
    hasPermission(context.permissions, "inspection.view", context.roles)
      ? supabase
          .from("inspection_photos")
          .select(
            "id, inspection_id, inspection_item_id, section_id, finding_id, category, storage_path, caption, uploaded_by, created_at",
          )
          .eq("inspection_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as PhotoRow[] }),
    supabase
      .from("inspection_recommendations")
      .select(
        "id, inspection_id, finding_id, recommendation, priority, notes, currency, created_by, created_at",
      )
      .eq("inspection_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const sectionsRaw = (sectionRows ?? []) as SectionRow[];
  const itemsRaw = (itemRows ?? []) as ItemRow[];
  const findingsRaw = (findingRows ?? []) as FindingRow[];
  const photosRaw = (photoRows ?? []) as PhotoRow[];
  const recommendationsRaw = (recommendationRows ?? []) as RecommendationRow[];

  const names = await loadProfileNames(supabase, [
    row.assigned_to,
    row.inspected_by,
    row.assigned_by,
    row.reviewed_by,
    row.created_by,
    row.updated_by,
    ...findingsRaw.map((f) => f.created_by),
    ...photosRaw.map((p) => p.uploaded_by),
  ]);

  const itemStatsBySection = new Map<string, { completed: number; total: number }>();
  for (const item of itemsRaw) {
    if (!item.section_id) continue;
    const stats = itemStatsBySection.get(item.section_id) ?? { completed: 0, total: 0 };
    stats.total += 1;
    if (item.result != null && item.result !== "not_tested") stats.completed += 1;
    itemStatsBySection.set(item.section_id, stats);
  }

  const items = itemsRaw.map(mapItem);
  const sections = sectionsRaw.map((s) => mapSection(s, itemStatsBySection.get(s.id)));

  const costs = await loadCosts(supabase, id, context);
  const includeCosts = canViewCosts(context);

  const findings = findingsRaw.map((f) =>
    mapFinding(
      f,
      names,
      includeCosts ? (costs.findingCosts.get(f.id) ?? null) : undefined,
    ),
  );

  let photos = photosRaw.map((p) => mapPhoto(p, names));
  photos = await attachSignedUrls(supabase, photos);

  const recommendations = recommendationsRaw.map((r) =>
    mapRecommendation(
      r,
      includeCosts ? (costs.recommendationCosts.get(r.id) ?? null) : undefined,
    ),
  );

  const counts = {
    critical: findings.filter((f) => f.isCritical && !f.isResolved).length,
    failed: items.filter((i) => i.result === "fail").length,
  };

  const base = mapListItem(row, counts, names);
  const progress = buildProgress(
    sections,
    items,
    findings,
    photos.length,
    includeCosts ? costs.findingsTotal : null,
  );

  const detail: InspectionDetail = {
    ...base,
    templateId: row.template_id,
    templateName: template?.name ?? null,
    odometerReading: row.odometer_reading == null ? null : Number(row.odometer_reading),
    odometerUnit: row.odometer_unit,
    vehicleMileage: vehicle?.mileage ?? null,
    summary: row.summary,
    recommendation: row.recommendation,
    notes: row.notes,
    vinVerified: row.vin_verified,
    vinMismatch: row.vin_mismatch,
    verifiedVin: row.verified_vin,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
    assignedByName: row.assigned_by ? (names.get(row.assigned_by) ?? null) : null,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by ? (names.get(row.reviewed_by) ?? null) : null,
    reviewedAt: row.reviewed_at,
    approvedAt: row.approved_at,
    rejectionReason: row.rejection_reason,
    reviewNote: row.review_note,
    cancelReason: row.cancel_reason,
    cancelledAt: row.cancelled_at,
    createdBy: row.created_by,
    createdByName: row.created_by ? (names.get(row.created_by) ?? null) : null,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by ? (names.get(row.updated_by) ?? null) : null,
    progress,
    sections,
    items,
    findings,
    photos,
    recommendations,
  };

  return { data: detail, error: null };
}

async function resolveTemplateId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  templateId: string | null | undefined,
  inspectionType: string,
): Promise<string | null> {
  if (templateId) return templateId;

  const { data } = await supabase
    .from("inspection_templates")
    .select("id")
    .eq("is_active", true)
    .eq("inspection_type", inspectionType)
    .order("name")
    .limit(1)
    .maybeSingle();

  if (data) return (data as { id: string }).id;

  const { data: fallback } = await supabase
    .from("inspection_templates")
    .select("id")
    .eq("is_active", true)
    .order("name")
    .limit(1)
    .maybeSingle();

  return fallback ? (fallback as { id: string }).id : null;
}

export async function createInspection(
  values: CreateInspectionValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (!hasPermission(context.permissions, "inspection.create", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const supabase = await createClient();

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, branch_id")
    .eq("id", values.vehicleId)
    .is("deleted_at", null)
    .maybeSingle();

  if (vehicleError) return { data: null, error: mapDbError(vehicleError) };
  if (!vehicle) {
    return { data: null, error: { code: "not_found", message: "Vehicle not found." } };
  }

  const vehicleRow = vehicle as { id: string; branch_id: string };
  const branchId = values.branchId ?? vehicleRow.branch_id;

  if (!canAccessBranch(context, branchId)) {
    return {
      data: null,
      error: { code: "forbidden", message: "You do not have access to this branch." },
    };
  }

  const templateId = await resolveTemplateId(
    supabase,
    values.templateId,
    values.inspectionType,
  );

  const { data, error } = await supabase
    .from("inspections")
    .insert({
      inspection_number: "",
      vehicle_id: values.vehicleId,
      branch_id: branchId,
      template_id: templateId,
      inspection_type: values.inspectionType,
      odometer_reading: values.odometerReading,
      odometer_unit: values.odometerUnit ?? "KM",
      notes: values.notes,
      parent_inspection_id: values.parentInspectionId,
      status: "draft",
      created_by: context.userId,
      updated_by: context.userId,
    })
    .select("id")
    .single();

  if (error) return { data: null, error: mapDbError(error) };

  const inspectionId = (data as { id: string }).id;

  if (templateId) {
    const { error: populateError } = await supabase.rpc("populate_inspection_checklist", {
      p_inspection_id: inspectionId,
    });
    if (populateError) return { data: null, error: mapDbError(populateError) };
  }

  await writeAudit(supabase, "INSPECTION_CREATED", inspectionId, null, {
    status: "draft",
    vehicle_id: values.vehicleId,
    branch_id: branchId,
  });

  if (values.assignedTo) {
    const assigned = await assignInspection(
      inspectionId,
      { assignedTo: values.assignedTo, reason: null },
      context,
    );
    if (assigned.error) return assigned;
    return assigned;
  }

  return getInspection(inspectionId, context);
}

export async function updateInspection(
  id: string,
  values: UpdateInspectionValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (!hasPermission(context.permissions, "inspection.edit", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(id, context);
  if (existing.error || !existing.data) return existing;

  if (isInspectionLocked(existing.data.status)) {
    const canOverride = hasPermission(
      context.permissions,
      "inspection.override",
      context.roles,
    );
    if (!canOverride) {
      return {
        data: null,
        error: { code: "conflict", message: "Approved or cancelled inspections cannot be edited." },
      };
    }
  }

  if (!canEditInspectionChecklist(existing.data.status) && !isInspectionLocked(existing.data.status)) {
    // submitted / under_review: allow limited header edits for reviewers with edit
    if (
      existing.data.status !== "submitted" &&
      existing.data.status !== "under_review"
    ) {
      return {
        data: null,
        error: { code: "conflict", message: "Inspection cannot be edited in this status." },
      };
    }
  }

  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_by: context.userId };

  if (values.inspectionType != null) patch.inspection_type = values.inspectionType;
  if (values.odometerReading !== undefined) patch.odometer_reading = values.odometerReading;
  if (values.odometerUnit != null) patch.odometer_unit = values.odometerUnit;
  if (values.notes !== undefined) patch.notes = values.notes;
  if (values.summary !== undefined) patch.summary = values.summary;
  if (values.recommendation !== undefined) patch.recommendation = values.recommendation;
  if (values.overallScore !== undefined) patch.overall_score = values.overallScore;
  if (values.result !== undefined) patch.result = values.result;
  if (values.vinVerified !== undefined) patch.vin_verified = values.vinVerified;
  if (values.vinMismatch !== undefined) patch.vin_mismatch = values.vinMismatch;
  if (values.verifiedVin !== undefined) patch.verified_vin = values.verifiedVin;

  const { error } = await supabase.from("inspections").update(patch).eq("id", id);
  if (error) return { data: null, error: mapDbError(error) };

  await writeAudit(supabase, "INSPECTION_UPDATED", id, null, patch as Json);

  return getInspection(id, context);
}

export async function saveInspectionDraft(
  id: string,
  values: SaveInspectionDraftValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (!hasPermission(context.permissions, "inspection.edit", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(id, context);
  if (existing.error || !existing.data) return existing;

  if (isInspectionLocked(existing.data.status)) {
    return {
      data: null,
      error: { code: "conflict", message: "Approved or cancelled inspections cannot be edited." },
    };
  }

  if (!canEditInspectionChecklist(existing.data.status)) {
    return {
      data: null,
      error: { code: "conflict", message: "Checklist can only be edited before submission." },
    };
  }

  const supabase = await createClient();
  const headerPatch: Record<string, unknown> = { updated_by: context.userId };

  if (values.odometerReading !== undefined) headerPatch.odometer_reading = values.odometerReading;
  if (values.odometerUnit != null) headerPatch.odometer_unit = values.odometerUnit;
  if (values.notes !== undefined) headerPatch.notes = values.notes;
  if (values.summary !== undefined) headerPatch.summary = values.summary;
  if (values.recommendation !== undefined) headerPatch.recommendation = values.recommendation;
  if (values.overallScore !== undefined) headerPatch.overall_score = values.overallScore;
  if (values.result !== undefined) headerPatch.result = values.result;
  if (values.vinVerified !== undefined) headerPatch.vin_verified = values.vinVerified;
  if (values.vinMismatch !== undefined) headerPatch.vin_mismatch = values.vinMismatch;
  if (values.verifiedVin !== undefined) headerPatch.verified_vin = values.verifiedVin;

  const { error: headerError } = await supabase
    .from("inspections")
    .update(headerPatch)
    .eq("id", id);
  if (headerError) return { data: null, error: mapDbError(headerError) };

  if (values.items?.length) {
    for (const item of values.items) {
      const { error: itemError } = await supabase
        .from("inspection_items")
        .update({
          result: item.result,
          severity: item.severity,
          notes: item.notes,
        })
        .eq("id", item.id)
        .eq("inspection_id", id);
      if (itemError) return { data: null, error: mapDbError(itemError) };
    }
  }

  if (values.sections?.length) {
    for (const section of values.sections) {
      const patch: Record<string, unknown> = { notes: section.notes };
      if (section.isCompleted !== undefined) patch.is_completed = section.isCompleted;
      const { error: sectionError } = await supabase
        .from("inspection_sections")
        .update(patch)
        .eq("id", section.id)
        .eq("inspection_id", id);
      if (sectionError) return { data: null, error: mapDbError(sectionError) };
    }
  }

  await writeAudit(supabase, "INSPECTION_UPDATED", id, null, {
    ...headerPatch,
    items_updated: values.items?.length ?? 0,
    sections_updated: values.sections?.length ?? 0,
  } as Json);

  return getInspection(id, context);
}

export async function assignInspection(
  id: string,
  values: AssignInspectionValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (!hasPermission(context.permissions, "inspection.edit", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(id, context);
  if (existing.error || !existing.data) return existing;

  if (!canAssignInspection(existing.data.status)) {
    return {
      data: null,
      error: {
        code: "conflict",
        message: "Inspection cannot be assigned in this status.",
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_inspection", {
    p_inspection_id: id,
    p_assigned_to: values.assignedTo,
    p_reason: values.reason ?? null,
  });
  if (error) return { data: null, error: mapDbError(error) };
  return getInspection(id, context);
}

export async function startInspection(
  id: string,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (
    !hasPermission(context.permissions, "inspection.edit", context.roles) &&
    !hasPermission(context.permissions, "inspection.submit", context.roles)
  ) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_inspection", {
    p_inspection_id: id,
  });
  if (error) return { data: null, error: mapDbError(error) };
  return getInspection(id, context);
}

export async function submitInspection(
  id: string,
  values: SubmitInspectionValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (
    !hasPermission(context.permissions, "inspection.submit", context.roles) &&
    !hasPermission(context.permissions, "inspection.edit", context.roles)
  ) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(id, context);
  if (existing.error || !existing.data) return existing;
  if (!canSubmitInspection(existing.data.status)) {
    return {
      data: null,
      error: { code: "conflict", message: "Inspection must be in progress to submit." },
    };
  }

  if (values.overrideIncomplete) {
    if (!hasPermission(context.permissions, "inspection.override", context.roles)) {
      return {
        data: null,
        error: {
          code: "forbidden",
          message: "Override permission is required to submit an incomplete checklist.",
        },
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_inspection", {
    p_inspection_id: id,
    p_overall_result: values.result ?? null,
    p_overall_score: values.overallScore ?? null,
    p_summary: values.summary ?? null,
    p_recommendation: values.recommendation ?? null,
    p_notes: values.notes ?? null,
    p_override_incomplete: values.overrideIncomplete ?? false,
  });
  if (error) return { data: null, error: mapDbError(error) };
  return getInspection(id, context);
}

export async function approveInspection(
  id: string,
  values: ApproveInspectionValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (!hasPermission(context.permissions, "inspection.approve", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(id, context);
  if (existing.error || !existing.data) return existing;
  if (existing.data.status !== "under_review") {
    return {
      data: null,
      error: { code: "conflict", message: "Inspection is not under review." },
    };
  }

  if (values.overrideCritical) {
    if (!hasPermission(context.permissions, "inspection.override", context.roles)) {
      return {
        data: null,
        error: {
          code: "forbidden",
          message: "Override permission is required to approve with critical findings.",
        },
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_inspection", {
    p_inspection_id: id,
    p_note: values.note ?? null,
    p_override_critical: values.overrideCritical ?? false,
  });
  if (error) return { data: null, error: mapDbError(error) };
  return getInspection(id, context);
}

export async function updateApprovedInspectionOutcome(
  id: string,
  values: UpdateInspectionOutcomeValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (!hasPermission(context.permissions, "inspection.approve", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(id, context);
  if (existing.error || !existing.data) return existing;
  if (existing.data.status !== "approved") {
    return {
      data: null,
      error: { code: "conflict", message: "Inspection is not approved." },
    };
  }

  if (values.overrideCritical) {
    if (!hasPermission(context.permissions, "inspection.override", context.roles)) {
      return {
        data: null,
        error: {
          code: "forbidden",
          message: "Override permission is required to pass with critical findings.",
        },
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_approved_inspection_outcome", {
    p_inspection_id: id,
    p_result: values.result,
    p_note: values.note ?? null,
    p_override_critical: values.overrideCritical ?? false,
    p_vehicle_status: values.vehicleStatus,
  });
  if (error) return { data: null, error: mapDbError(error) };
  return getInspection(id, context);
}

export async function rejectInspection(
  id: string,
  values: RejectInspectionValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (
    !hasPermission(context.permissions, "inspection.reject", context.roles) &&
    !hasPermission(context.permissions, "inspection.approve", context.roles)
  ) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_inspection", {
    p_inspection_id: id,
    p_reason: values.reason,
  });
  if (error) return { data: null, error: mapDbError(error) };
  return getInspection(id, context);
}

export async function cancelInspection(
  id: string,
  values: CancelInspectionValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (!hasPermission(context.permissions, "inspection.edit", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_inspection", {
    p_inspection_id: id,
    p_reason: values.reason,
  });
  if (error) return { data: null, error: mapDbError(error) };
  return getInspection(id, context);
}

export async function requestReinspection(
  id: string,
  values: ReinspectValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (
    !hasPermission(context.permissions, "inspection.reinspect", context.roles) &&
    !hasPermission(context.permissions, "inspection.approve", context.roles)
  ) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_reinspection", {
    p_inspection_id: id,
    p_reason: values.reason,
    p_assigned_to: values.assignedTo ?? null,
  });
  if (error) return { data: null, error: mapDbError(error) };

  const childId =
    data && typeof data === "object" && "id" in data
      ? String((data as { id: string }).id)
      : null;

  if (!childId) {
    return {
      data: null,
      error: { code: "unknown", message: "Reinspection was created but could not be loaded." },
    };
  }

  return getInspection(childId, context);
}

export async function changeInspectionStatus(
  id: string,
  values: ChangeInspectionStatusValues,
  context: UserContext,
): Promise<ServiceResult<InspectionDetail>> {
  if (values.status === "submitted") {
    return submitInspection(id, { overrideIncomplete: false }, context);
  }
  if (values.status === "approved") {
    return approveInspection(id, { note: values.reason, overrideCritical: false }, context);
  }
  if (values.status === "rejected") {
    return rejectInspection(id, { reason: values.reason }, context);
  }
  if (values.status === "cancelled") {
    return cancelInspection(id, { reason: values.reason }, context);
  }
  if (values.status === "in_progress") {
    return startInspection(id, context);
  }

  if (!hasPermission(context.permissions, "inspection.edit", context.roles)) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(id, context);
  if (existing.error || !existing.data) return existing;

  if (!isValidInspectionStatusTransition(existing.data.status, values.status)) {
    return {
      data: null,
      error: { code: "invalid_transition", message: "That status change is not allowed." },
    };
  }

  if (values.status === "under_review") {
    if (
      !hasPermission(context.permissions, "inspection.review", context.roles) &&
      !hasPermission(context.permissions, "inspection.edit", context.roles)
    ) {
      return { data: null, error: { code: "forbidden", message: "Not authorized." } };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_inspection_status", {
    p_inspection_id: id,
    p_new_status: values.status,
    p_reason: values.reason,
  });
  if (error) return { data: null, error: mapDbError(error) };
  return getInspection(id, context);
}

export async function addFinding(
  inspectionId: string,
  values: InspectionFindingValues,
  context: UserContext,
): Promise<ServiceResult<InspectionFinding>> {
  if (
    !hasPermission(context.permissions, "inspection.finding.create", context.roles) &&
    !hasPermission(context.permissions, "inspection.edit", context.roles)
  ) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(inspectionId, context);
  if (existing.error || !existing.data) {
    return { data: null, error: existing.error };
  }

  if (isInspectionLocked(existing.data.status)) {
    const canOverride = hasPermission(
      context.permissions,
      "inspection.override",
      context.roles,
    );
    if (!canOverride) {
      return {
        data: null,
        error: { code: "conflict", message: "Cannot add findings to a locked inspection." },
      };
    }
  }

  const supabase = await createClient();
  const insertPayload: Record<string, unknown> = {
    inspection_id: inspectionId,
    inspection_item_id: values.inspectionItemId,
    section_id: values.sectionId,
    result: values.result,
    severity: values.severity,
    title: values.title,
    description: values.description,
    recommended_action: values.recommendedAction,
    recommendation: values.recommendation,
    currency: values.currency ?? "AED",
    damage_type: values.damageType,
    damage_location: values.damageLocation,
    is_resolved: values.isResolved ?? false,
    created_by: context.userId,
    updated_by: context.userId,
  };

  // Writers may set cost without cost.view; reads still hide it without cost.view.
  if (values.estimatedCost !== undefined) {
    insertPayload.estimated_cost = values.estimatedCost;
  }

  const { data, error } = await supabase
    .from("inspection_findings")
    .insert(insertPayload)
    .select(
      "id, inspection_id, inspection_item_id, section_id, result, severity, title, description, recommended_action, recommendation, currency, damage_type, damage_location, is_critical, is_resolved, created_by, created_at, updated_at",
    )
    .single();

  if (error) return { data: null, error: mapDbError(error) };

  await writeAudit(supabase, "INSPECTION_FINDING_CREATED", inspectionId, null, {
    finding_id: (data as FindingRow).id,
    title: values.title,
    severity: values.severity,
  });

  const names = await loadProfileNames(supabase, [(data as FindingRow).created_by]);
  let estimatedCost: number | null | undefined;
  if (canViewCosts(context) && values.estimatedCost !== undefined) {
    estimatedCost = values.estimatedCost;
  } else if (canViewCosts(context)) {
    const costs = await loadCosts(supabase, inspectionId, context);
    estimatedCost = costs.findingCosts.get((data as FindingRow).id) ?? null;
  }

  return {
    data: mapFinding(data as FindingRow, names, estimatedCost),
    error: null,
  };
}

export async function updateFinding(
  inspectionId: string,
  findingId: string,
  values: UpdateInspectionFindingValues,
  context: UserContext,
): Promise<ServiceResult<InspectionFinding>> {
  if (
    !hasPermission(context.permissions, "inspection.finding.edit", context.roles) &&
    !hasPermission(context.permissions, "inspection.edit", context.roles)
  ) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(inspectionId, context);
  if (existing.error || !existing.data) {
    return { data: null, error: existing.error };
  }

  if (isInspectionLocked(existing.data.status)) {
    const canOverride = hasPermission(
      context.permissions,
      "inspection.override",
      context.roles,
    );
    if (!canOverride) {
      return {
        data: null,
        error: { code: "conflict", message: "Cannot edit findings on a locked inspection." },
      };
    }
  }

  const patch: Record<string, unknown> = { updated_by: context.userId };
  if (values.inspectionItemId !== undefined) patch.inspection_item_id = values.inspectionItemId;
  if (values.sectionId !== undefined) patch.section_id = values.sectionId;
  if (values.result != null) patch.result = values.result;
  if (values.severity != null) patch.severity = values.severity;
  if (values.title != null) patch.title = values.title;
  if (values.description !== undefined) patch.description = values.description;
  if (values.recommendedAction !== undefined) {
    patch.recommended_action = values.recommendedAction;
  }
  if (values.recommendation !== undefined) patch.recommendation = values.recommendation;
  if (values.estimatedCost !== undefined) patch.estimated_cost = values.estimatedCost;
  if (values.currency != null) patch.currency = values.currency;
  if (values.damageType !== undefined) patch.damage_type = values.damageType;
  if (values.damageLocation !== undefined) patch.damage_location = values.damageLocation;
  if (values.isResolved !== undefined) patch.is_resolved = values.isResolved;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_findings")
    .update(patch)
    .eq("id", findingId)
    .eq("inspection_id", inspectionId)
    .select(
      "id, inspection_id, inspection_item_id, section_id, result, severity, title, description, recommended_action, recommendation, currency, damage_type, damage_location, is_critical, is_resolved, created_by, created_at, updated_at",
    )
    .maybeSingle();

  if (error) return { data: null, error: mapDbError(error) };
  if (!data) {
    return { data: null, error: { code: "not_found", message: "Finding not found." } };
  }

  await writeAudit(supabase, "INSPECTION_FINDING_UPDATED", inspectionId, null, {
    finding_id: findingId,
    ...patch,
  } as Json);

  const names = await loadProfileNames(supabase, [(data as FindingRow).created_by]);
  let estimatedCost: number | null | undefined;
  if (canViewCosts(context)) {
    if (values.estimatedCost !== undefined) {
      estimatedCost = values.estimatedCost;
    } else {
      const costs = await loadCosts(supabase, inspectionId, context);
      estimatedCost = costs.findingCosts.get(findingId) ?? null;
    }
  }

  return {
    data: mapFinding(data as FindingRow, names, estimatedCost),
    error: null,
  };
}

export async function deleteFinding(
  inspectionId: string,
  findingId: string,
  context: UserContext,
): Promise<ServiceResult<{ id: string }>> {
  if (
    !hasPermission(context.permissions, "inspection.finding.edit", context.roles) &&
    !hasPermission(context.permissions, "inspection.edit", context.roles)
  ) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(inspectionId, context);
  if (existing.error || !existing.data) {
    return { data: null, error: existing.error };
  }

  if (isInspectionLocked(existing.data.status)) {
    return {
      data: null,
      error: { code: "conflict", message: "Cannot delete findings from a locked inspection." },
    };
  }

  if (
    existing.data.status === "submitted" ||
    existing.data.status === "under_review"
  ) {
    const canOverride = hasPermission(
      context.permissions,
      "inspection.override",
      context.roles,
    );
    if (!canOverride) {
      return {
        data: null,
        error: {
          code: "conflict",
          message: "Findings cannot be deleted after submission without override permission.",
        },
      };
    }
  }

  const supabase = await createClient();
  const { data: finding } = await supabase
    .from("inspection_findings")
    .select("id")
    .eq("id", findingId)
    .eq("inspection_id", inspectionId)
    .maybeSingle();

  if (!finding) {
    return { data: null, error: { code: "not_found", message: "Finding not found." } };
  }

  const { error } = await supabase
    .from("inspection_findings")
    .delete()
    .eq("id", findingId)
    .eq("inspection_id", inspectionId);

  if (error) return { data: null, error: mapDbError(error) };

  await writeAudit(supabase, "INSPECTION_FINDING_DELETED", inspectionId, {
    finding_id: findingId,
  }, null);

  return { data: { id: findingId }, error: null };
}

export async function addInspectionPhoto(
  inspectionId: string,
  values: InspectionPhotoValues,
  context: UserContext,
): Promise<ServiceResult<InspectionPhoto>> {
  if (
    !hasPermission(context.permissions, "inspection.photo.create", context.roles) &&
    !hasPermission(context.permissions, "inspection.edit", context.roles)
  ) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(inspectionId, context);
  if (existing.error || !existing.data) {
    return { data: null, error: existing.error };
  }

  if (isInspectionLocked(existing.data.status)) {
    const canOverride = hasPermission(
      context.permissions,
      "inspection.override",
      context.roles,
    );
    if (!canOverride) {
      return {
        data: null,
        error: { code: "conflict", message: "Cannot add photos to a locked inspection." },
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_photos")
    .insert({
      inspection_id: inspectionId,
      storage_path: values.storagePath,
      category: values.category ?? "other",
      caption: values.caption,
      inspection_item_id: values.inspectionItemId,
      section_id: values.sectionId,
      finding_id: values.findingId,
      uploaded_by: context.userId,
    })
    .select(
      "id, inspection_id, inspection_item_id, section_id, finding_id, category, storage_path, caption, uploaded_by, created_at",
    )
    .single();

  if (error) return { data: null, error: mapDbError(error) };

  await writeAudit(supabase, "INSPECTION_PHOTO_CREATED", inspectionId, null, {
    photo_id: (data as PhotoRow).id,
    category: values.category,
  });

  const names = await loadProfileNames(supabase, [(data as PhotoRow).uploaded_by]);
  const [withUrl] = await attachSignedUrls(supabase, [mapPhoto(data as PhotoRow, names)]);
  return { data: withUrl!, error: null };
}

export async function deleteInspectionPhoto(
  inspectionId: string,
  photoId: string,
  context: UserContext,
): Promise<ServiceResult<{ id: string }>> {
  const canDelete =
    hasPermission(context.permissions, "inspection.photo.delete", context.roles) ||
    hasPermission(context.permissions, "inspection.edit", context.roles);
  if (!canDelete) {
    return { data: null, error: { code: "forbidden", message: "Not authorized." } };
  }

  const existing = await getInspection(inspectionId, context);
  if (existing.error || !existing.data) {
    return { data: null, error: existing.error };
  }

  if (isInspectionLocked(existing.data.status)) {
    return {
      data: null,
      error: { code: "conflict", message: "Cannot delete photos from a locked inspection." },
    };
  }

  if (
    existing.data.status === "submitted" ||
    existing.data.status === "under_review"
  ) {
    const canOverride = hasPermission(
      context.permissions,
      "inspection.override",
      context.roles,
    );
    const hasExplicitDelete = hasPermission(
      context.permissions,
      "inspection.photo.delete",
      context.roles,
    );
    if (!canOverride && !hasExplicitDelete) {
      return {
        data: null,
        error: {
          code: "conflict",
          message: "Photos cannot be deleted after submission without override permission.",
        },
      };
    }
  }

  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("inspection_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("inspection_id", inspectionId)
    .maybeSingle();

  if (!photo) {
    return { data: null, error: { code: "not_found", message: "Photo not found." } };
  }

  const { error } = await supabase
    .from("inspection_photos")
    .delete()
    .eq("id", photoId)
    .eq("inspection_id", inspectionId);

  if (error) return { data: null, error: mapDbError(error) };

  try {
    await supabase.storage
      .from("inspection-photos")
      .remove([(photo as { storage_path: string }).storage_path]);
  } catch {
    /* storage cleanup best-effort */
  }

  await writeAudit(supabase, "INSPECTION_PHOTO_DELETED", inspectionId, {
    photo_id: photoId,
  }, null);

  return { data: { id: photoId }, error: null };
}

export async function getInspectionHistory(
  id: string,
): Promise<ServiceResult<InspectionStatusHistoryItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_status_history")
    .select("id, inspection_id, from_status, to_status, reason, changed_by, changed_at")
    .eq("inspection_id", id)
    .order("changed_at", { ascending: false });

  if (error) return { data: null, error: mapDbError(error) };

  const rows = (data ?? []) as {
    id: string;
    inspection_id: string;
    from_status: InspectionStatus | null;
    to_status: InspectionStatus;
    reason: string | null;
    changed_by: string | null;
    changed_at: string;
  }[];

  const names = await loadProfileNames(
    supabase,
    rows.map((r) => r.changed_by),
  );

  return {
    data: rows.map((row) => ({
      id: row.id,
      inspectionId: row.inspection_id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      reason: row.reason,
      changedBy: row.changed_by,
      changedByName: row.changed_by ? (names.get(row.changed_by) ?? null) : null,
      changedAt: row.changed_at,
    })),
    error: null,
  };
}

export async function getInspectionActivity(
  id: string,
): Promise<ServiceResult<InspectionActivityItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, user_id, old_values, new_values, metadata, created_at")
    .eq("entity_type", "inspections")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { data: null, error: mapDbError(error) };

  const rows = (data ?? []) as {
    id: string;
    action: string;
    user_id: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }[];

  const names = await loadProfileNames(
    supabase,
    rows.map((r) => r.user_id),
  );

  return {
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.user_id,
      actorName: row.user_id ? (names.get(row.user_id) ?? null) : null,
      oldValues: row.old_values,
      newValues: row.new_values,
      metadata: row.metadata,
      createdAt: row.created_at,
    })),
    error: null,
  };
}

export async function getInspectionMeta(
  branchId?: string,
  context?: UserContext,
): Promise<ServiceResult<InspectionMeta>> {
  const supabase = await createClient();

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  const { data: templates } = await supabase
    .from("inspection_templates")
    .select("id, name, description, inspection_type, is_active")
    .eq("is_active", true)
    .order("name");

  let inspectorsQuery = supabase
    .from("profiles")
    .select("id, display_name, branch_id")
    .is("deleted_at", null)
    .order("display_name");
  if (branchId) inspectorsQuery = inspectorsQuery.eq("branch_id", branchId);
  const { data: inspectors } = await inspectorsQuery.limit(200);

  let vehiclesQuery = supabase
    .from("vehicles")
    .select("id, stock_number, make, model, year, vin, mileage, branch_id, status")
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (branchId) vehiclesQuery = vehiclesQuery.eq("branch_id", branchId);
  if (context && context.branchScope !== "ALL_BRANCHES" && context.accessibleBranchIds.length > 0) {
    vehiclesQuery = vehiclesQuery.in("branch_id", context.accessibleBranchIds);
  }
  const { data: vehicles } = await vehiclesQuery;

  return {
    data: {
      branches: ((branches ?? []) as { id: string; name: string; code: string | null }[]).map(
        (b) => ({ id: b.id, name: b.name, code: b.code ?? "" }),
      ),
      templates: (
        (templates ?? []) as {
          id: string;
          name: string;
          description: string | null;
          inspection_type: InspectionMeta["templates"][number]["inspectionType"];
          is_active: boolean;
        }[]
      ).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        inspectionType: t.inspection_type,
        isActive: t.is_active,
      })),
      inspectors: ((inspectors ?? []) as { id: string; display_name: string }[]).map((p) => ({
        id: p.id,
        name: p.display_name,
      })),
      vehicles: (
        (vehicles ?? []) as {
          id: string;
          stock_number: string;
          make: string;
          model: string;
          year: number;
          vin: string | null;
          mileage: number;
          branch_id: string;
          status: string;
        }[]
      ).map((v) => ({
        id: v.id,
        stockNumber: v.stock_number,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin,
        mileage: v.mileage,
        branchId: v.branch_id,
        status: v.status,
      })),
      statuses: INSPECTION_STATUSES,
      types: INSPECTION_TYPES,
      results: INSPECTION_RESULTS,
      itemResults: INSPECTION_ITEM_RESULTS,
      severities: INSPECTION_SEVERITIES,
      recommendations: INSPECTION_RECOMMENDATIONS,
      photoCategories: INSPECTION_PHOTO_CATEGORIES,
      damageTypes: INSPECTION_DAMAGE_TYPES,
      damageLocations: INSPECTION_DAMAGE_LOCATIONS,
    },
    error: null,
  };
}

export async function listInspectionsForVehicle(
  vehicleId: string,
  context: UserContext,
): Promise<ServiceResult<VehicleInspectionSummary[]>> {
  void context;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .select(
      "id, inspection_number, status, result, overall_score, started_at, submitted_at, created_at",
    )
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: mapDbError(error) };

  const rows = (data ?? []) as {
    id: string;
    inspection_number: string;
    status: InspectionStatus;
    result: VehicleInspectionSummary["result"];
    overall_score: number | null;
    started_at: string | null;
    submitted_at: string | null;
    created_at: string;
  }[];

  const counts = await loadListCounts(
    supabase,
    rows.map((r) => r.id),
  );

  return {
    data: rows.map((row) => ({
      id: row.id,
      inspectionNumber: row.inspection_number,
      status: row.status,
      result: row.result,
      overallScore: row.overall_score == null ? null : Number(row.overall_score),
      criticalFindingsCount: counts.get(row.id)?.critical ?? 0,
      inspectedAt: row.started_at,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
    })),
    error: null,
  };
}
