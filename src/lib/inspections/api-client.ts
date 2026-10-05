import type {
  InspectionActivityItem,
  InspectionDetail,
  InspectionFinding,
  InspectionListResult,
  InspectionMeta,
  InspectionPhoto,
  InspectionStatusHistoryItem,
  VehicleInspectionSummary,
} from "@/types/inspection";
import type {
  ApproveInspectionValues,
  AssignInspectionValues,
  CancelInspectionValues,
  ChangeInspectionStatusValues,
  CreateInspectionValues,
  InspectionFindingValues,
  InspectionPhotoValues,
  RejectInspectionValues,
  ReinspectValues,
  SaveInspectionDraftValues,
  SubmitInspectionValues,
  UpdateInspectionFindingValues,
  UpdateInspectionValues,
} from "@/lib/validation/inspection";

export type ApiSuccess<T> = { status: "success"; data: T };
export type ApiFailure = {
  status: "error";
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function parseJson<T>(response: Response): Promise<ApiResult<T>> {
  const data = (await response.json().catch(() => null)) as ApiResult<T> | null;
  if (!data || typeof data !== "object") {
    return { status: "error", error: "unknown", message: "Unexpected server response." };
  }
  return data;
}

export async function fetchInspections(search: string): Promise<ApiResult<InspectionListResult>> {
  const response = await fetch(`/api/inspections?${search}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function fetchInspection(id: string): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function fetchInspectionHistory(
  id: string,
): Promise<ApiResult<InspectionStatusHistoryItem[]>> {
  const response = await fetch(`/api/inspections/${id}/history`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function fetchInspectionActivity(
  id: string,
): Promise<ApiResult<InspectionActivityItem[]>> {
  const response = await fetch(`/api/inspections/${id}/activity`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function fetchInspectionMeta(params?: {
  branchId?: string;
}): Promise<ApiResult<InspectionMeta>> {
  const search = new URLSearchParams();
  if (params?.branchId) search.set("branchId", params.branchId);
  const qs = search.toString();
  const response = await fetch(`/api/inspections/meta${qs ? `?${qs}` : ""}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function fetchVehicleInspections(
  vehicleId: string,
): Promise<ApiResult<VehicleInspectionSummary[]>> {
  const response = await fetch(`/api/inspections/vehicle/${vehicleId}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function createInspectionRequest(
  body: CreateInspectionValues,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch("/api/inspections", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function updateInspectionRequest(
  id: string,
  body: UpdateInspectionValues,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function saveInspectionDraftRequest(
  id: string,
  body: SaveInspectionDraftValues,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/draft`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function assignInspectionRequest(
  id: string,
  body: AssignInspectionValues,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/assign`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function startInspectionRequest(
  id: string,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/start`, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function submitInspectionRequest(
  id: string,
  body: SubmitInspectionValues = { overrideIncomplete: false },
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/submit`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function changeInspectionStatusRequest(
  id: string,
  body: ChangeInspectionStatusValues,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/status`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function approveInspectionRequest(
  id: string,
  body: ApproveInspectionValues = { note: null, overrideCritical: false },
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/approve`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function rejectInspectionRequest(
  id: string,
  body: RejectInspectionValues,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/reject`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function cancelInspectionRequest(
  id: string,
  body: CancelInspectionValues,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/cancel`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function reinspectRequest(
  id: string,
  body: ReinspectValues,
): Promise<ApiResult<InspectionDetail>> {
  const response = await fetch(`/api/inspections/${id}/reinspect`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function addFindingRequest(
  id: string,
  body: InspectionFindingValues,
): Promise<ApiResult<InspectionFinding>> {
  const response = await fetch(`/api/inspections/${id}/findings`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function updateFindingRequest(
  id: string,
  findingId: string,
  body: UpdateInspectionFindingValues,
): Promise<ApiResult<InspectionFinding>> {
  const response = await fetch(`/api/inspections/${id}/findings/${findingId}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function deleteFindingRequest(
  id: string,
  findingId: string,
): Promise<ApiResult<{ id: string }>> {
  const response = await fetch(`/api/inspections/${id}/findings/${findingId}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function addPhotoRequest(
  id: string,
  body: InspectionPhotoValues,
): Promise<ApiResult<InspectionPhoto>> {
  const response = await fetch(`/api/inspections/${id}/photos`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function deletePhotoRequest(
  id: string,
  photoId: string,
): Promise<ApiResult<{ id: string }>> {
  const response = await fetch(`/api/inspections/${id}/photos/${photoId}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}
