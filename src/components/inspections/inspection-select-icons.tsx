import type { ReactNode } from "react";
import {
  AlertTriangleIcon,
  ArrowDownWideNarrowIcon,
  ArrowUpWideNarrowIcon,
  Building2Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  FileCheckIcon,
  FileWarningIcon,
  GaugeIcon,
  RotateCcwIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";

import type {
  InspectionResult,
  InspectionSortField,
  InspectionStatus,
  InspectionType,
} from "@/types/inspection";

export const BRANCH_ICON = <Building2Icon />;
export const USER_ICON = <UserIcon />;

export const INSPECTION_STATUS_ICONS: Record<InspectionStatus, ReactNode> = {
  draft: <ClipboardListIcon />,
  assigned: <UserIcon />,
  in_progress: <GaugeIcon />,
  submitted: <FileCheckIcon />,
  under_review: <ClipboardCheckIcon />,
  approved: <CheckCircle2Icon />,
  rejected: <XCircleIcon />,
  cancelled: <RotateCcwIcon />,
};

export const INSPECTION_TYPE_ICONS: Record<InspectionType, ReactNode> = {
  full_inspection: <ClipboardCheckIcon />,
  basic_inspection: <ClipboardListIcon />,
  pre_purchase_inspection: <FileCheckIcon />,
  return_inspection: <RotateCcwIcon />,
  re_inspection: <RotateCcwIcon />,
};

export const INSPECTION_RESULT_ICONS: Record<InspectionResult, ReactNode> = {
  pass: <CheckCircle2Icon />,
  pass_with_advisories: <FileWarningIcon />,
  repair_required: <AlertTriangleIcon />,
  fail: <XCircleIcon />,
};

export const INSPECTION_SORT_ICONS: Record<InspectionSortField, ReactNode> = {
  created_at: <CalendarIcon />,
  updated_at: <CalendarIcon />,
  inspection_number: <ClipboardListIcon />,
  status: <GaugeIcon />,
  result: <CheckCircle2Icon />,
  overall_score: <GaugeIcon />,
  submitted_at: <CalendarIcon />,
};

export const ORDER_ICONS = {
  asc: <ArrowUpWideNarrowIcon />,
  desc: <ArrowDownWideNarrowIcon />,
} as const;
