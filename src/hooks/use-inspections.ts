"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addFindingRequest,
  addPhotoRequest,
  approveInspectionRequest,
  assignInspectionRequest,
  cancelInspectionRequest,
  changeInspectionStatusRequest,
  createInspectionRequest,
  deleteFindingRequest,
  deletePhotoRequest,
  fetchInspection,
  fetchInspectionActivity,
  fetchInspectionHistory,
  fetchInspectionMeta,
  fetchInspections,
  fetchVehicleInspections,
  rejectInspectionRequest,
  reinspectRequest,
  saveInspectionDraftRequest,
  startInspectionRequest,
  submitInspectionRequest,
  updateFindingRequest,
  updateInspectionRequest,
} from "@/lib/inspections/api-client";
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

export const inspectionKeys = {
  all: ["inspections"] as const,
  list: (search: string) => ["inspections", "list", search] as const,
  detail: (id: string) => ["inspections", "detail", id] as const,
  history: (id: string) => ["inspections", "history", id] as const,
  activity: (id: string) => ["inspections", "activity", id] as const,
  meta: (branchId?: string) => ["inspections", "meta", branchId ?? ""] as const,
  vehicle: (vehicleId: string) => ["inspections", "vehicle", vehicleId] as const,
};

function mutationError(result: { message: string; fieldErrors?: Record<string, string>; error: string }) {
  const error = new Error(result.message) as Error & {
    fieldErrors?: Record<string, string>;
    code?: string;
  };
  error.fieldErrors = result.fieldErrors;
  error.code = result.error;
  return error;
}

export function useInspectionList(search: string) {
  return useQuery({
    queryKey: inspectionKeys.list(search),
    queryFn: async () => {
      const result = await fetchInspections(search);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: inspectionKeys.detail(id),
    queryFn: async () => {
      const result = await fetchInspection(id);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useInspectionHistory(id: string) {
  return useQuery({
    queryKey: inspectionKeys.history(id),
    queryFn: async () => {
      const result = await fetchInspectionHistory(id);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useInspectionActivity(id: string) {
  return useQuery({
    queryKey: inspectionKeys.activity(id),
    queryFn: async () => {
      const result = await fetchInspectionActivity(id);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useInspectionMeta(branchId?: string) {
  return useQuery({
    queryKey: inspectionKeys.meta(branchId),
    queryFn: async () => {
      const result = await fetchInspectionMeta({ branchId });
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
  });
}

export function useVehicleInspections(vehicleId: string) {
  return useQuery({
    queryKey: inspectionKeys.vehicle(vehicleId),
    queryFn: async () => {
      const result = await fetchVehicleInspections(vehicleId);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    enabled: Boolean(vehicleId),
  });
}

export function useInspectionMutations(inspectionId?: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    if (inspectionId) {
      await queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
      await queryClient.invalidateQueries({ queryKey: inspectionKeys.history(inspectionId) });
      await queryClient.invalidateQueries({ queryKey: inspectionKeys.activity(inspectionId) });
    }
  };

  const create = useMutation({
    mutationFn: async (body: CreateInspectionValues) => {
      const result = await createInspectionRequest(body);
      if (result.status === "error") throw mutationError(result);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (body: UpdateInspectionValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await updateInspectionRequest(inspectionId, body);
      if (result.status === "error") throw mutationError(result);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const saveDraft = useMutation({
    mutationFn: async (body: SaveInspectionDraftValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await saveInspectionDraftRequest(inspectionId, body);
      if (result.status === "error") throw mutationError(result);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const assign = useMutation({
    mutationFn: async (body: AssignInspectionValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await assignInspectionRequest(inspectionId, body);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const start = useMutation({
    mutationFn: async () => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await startInspectionRequest(inspectionId);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const submit = useMutation({
    mutationFn: async (body: SubmitInspectionValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await submitInspectionRequest(inspectionId, body);
      if (result.status === "error") throw mutationError(result);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: async (body: ApproveInspectionValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await approveInspectionRequest(inspectionId, body);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: async (body: RejectInspectionValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await rejectInspectionRequest(inspectionId, body);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: async (body: CancelInspectionValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await cancelInspectionRequest(inspectionId, body);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const reinspect = useMutation({
    mutationFn: async (body: ReinspectValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await reinspectRequest(inspectionId, body);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const changeStatus = useMutation({
    mutationFn: async (body: ChangeInspectionStatusValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await changeInspectionStatusRequest(inspectionId, body);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const addFinding = useMutation({
    mutationFn: async (body: InspectionFindingValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await addFindingRequest(inspectionId, body);
      if (result.status === "error") throw mutationError(result);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const updateFinding = useMutation({
    mutationFn: async ({
      findingId,
      body,
    }: {
      findingId: string;
      body: UpdateInspectionFindingValues;
    }) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await updateFindingRequest(inspectionId, findingId, body);
      if (result.status === "error") throw mutationError(result);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const deleteFinding = useMutation({
    mutationFn: async (findingId: string) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await deleteFindingRequest(inspectionId, findingId);
      if (result.status === "error") throw mutationError(result);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const addPhoto = useMutation({
    mutationFn: async (body: InspectionPhotoValues) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await addPhotoRequest(inspectionId, body);
      if (result.status === "error") throw mutationError(result);
      return result.data;
    },
    onSuccess: invalidate,
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      if (!inspectionId) throw new Error("Missing inspection id");
      const result = await deletePhotoRequest(inspectionId, photoId);
      if (result.status === "error") throw new Error(result.message);
      return result.data;
    },
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    saveDraft,
    assign,
    start,
    submit,
    approve,
    reject,
    cancel,
    reinspect,
    changeStatus,
    addFinding,
    updateFinding,
    deleteFinding,
    addPhoto,
    deletePhoto,
  };
}
