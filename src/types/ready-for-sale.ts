import type { InspectionResult } from "@/types/inspection";
import type { VehicleStatus } from "@/types/vehicle";

export type ReadyForSaleAction =
  | "view_inspection"
  | "create_inspection"
  | "view_documents"
  | null;

export type ReadyForSaleCheck = {
  key: string;
  ok: boolean;
  label: string;
};

export type ReadyForSaleBlocker = {
  code: string;
  message: string;
  action: ReadyForSaleAction;
  inspectionId?: string;
};

export type ReadyForSaleEligibility = {
  eligible: boolean;
  canOverride: boolean;
  vehicleId: string;
  stockNumber: string;
  make: string;
  model: string;
  year: number;
  currentStatus: VehicleStatus;
  inspection: {
    id: string;
    inspectionNumber: string;
    result: InspectionResult | null;
    approvedAt: string | null;
    completedAt: string | null;
    expired: boolean;
    repairsRequired: boolean;
  } | null;
  /** Workshop is no longer required; kept optional for API compatibility. */
  workshop?: {
    required: boolean;
    orderId: string | null;
    orderNumber: string | null;
    status: string | null;
    qualityResult: string | null;
    activeOrders: number;
    pendingJobs: number;
  };
  checks: ReadyForSaleCheck[];
  blockers: ReadyForSaleBlocker[];
  summary: {
    inspection: string;
    workshop?: string;
  };
  error?: string;
};

export type MarkReadyForSaleInput = {
  reason?: string | null;
  override?: boolean;
  overrideReason?: string | null;
};
