import type { InspectionStatus } from "@/types/inspection";
import { INSPECTION_STATUSES } from "@/types/inspection";

/**
 * Central inspection workflow map (mirrors PostgreSQL is_valid_inspection_status_transition).
 */
export const INSPECTION_STATUS_TRANSITIONS: Record<
  InspectionStatus,
  readonly InspectionStatus[]
> = {
  draft: ["assigned", "in_progress", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["submitted", "cancelled"],
  submitted: ["under_review", "cancelled"],
  under_review: ["approved", "rejected"],
  approved: [],
  rejected: ["in_progress", "cancelled"],
  cancelled: [],
};

export function getAllowedNextStatuses(from: InspectionStatus): InspectionStatus[] {
  return [...INSPECTION_STATUS_TRANSITIONS[from]];
}

export function isValidInspectionStatusTransition(
  from: InspectionStatus,
  to: InspectionStatus,
) {
  if (from === to) return true;
  return INSPECTION_STATUS_TRANSITIONS[from].includes(to);
}

export function isInspectionStatus(value: string): value is InspectionStatus {
  return (INSPECTION_STATUSES as readonly string[]).includes(value);
}

/** Approved and cancelled inspections are locked for normal edits. */
export function isInspectionLocked(status: InspectionStatus) {
  return status === "approved" || status === "cancelled";
}

export function canEditInspectionChecklist(status: InspectionStatus) {
  return (
    status === "draft" ||
    status === "assigned" ||
    status === "in_progress" ||
    status === "rejected"
  );
}

export function canSubmitInspection(status: InspectionStatus) {
  return status === "in_progress";
}

export function canReviewInspection(status: InspectionStatus) {
  return status === "submitted" || status === "under_review";
}

export function canAssignInspection(status: InspectionStatus) {
  return status === "draft" || status === "assigned";
}
