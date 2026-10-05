export const INSPECTION_STATUSES = [
  "draft",
  "assigned",
  "in_progress",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const INSPECTION_TYPES = [
  "full_inspection",
  "basic_inspection",
  "pre_purchase_inspection",
  "return_inspection",
  "re_inspection",
] as const;

export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const INSPECTION_RESULTS = [
  "pass",
  "pass_with_advisories",
  "repair_required",
  "fail",
] as const;

export type InspectionResult = (typeof INSPECTION_RESULTS)[number];

export const INSPECTION_ITEM_RESULTS = [
  "pass",
  "fail",
  "advisory",
  "not_applicable",
  "not_tested",
] as const;

export type InspectionItemResult = (typeof INSPECTION_ITEM_RESULTS)[number];

export const INSPECTION_SEVERITIES = [
  "info",
  "minor",
  "moderate",
  "major",
  "critical",
] as const;

export type InspectionSeverity = (typeof INSPECTION_SEVERITIES)[number];

export const INSPECTION_RECOMMENDATIONS = [
  "no_action",
  "monitor",
  "repair_before_sale",
  "repair_urgently",
  "replace",
  "reinspect",
] as const;

export type InspectionRecommendation = (typeof INSPECTION_RECOMMENDATIONS)[number];

export const INSPECTION_PHOTO_CATEGORIES = [
  "front",
  "rear",
  "left_side",
  "right_side",
  "interior",
  "dashboard",
  "odometer",
  "vin",
  "engine",
  "tyre",
  "damage",
  "undercarriage",
  "other",
] as const;

export type InspectionPhotoCategory = (typeof INSPECTION_PHOTO_CATEGORIES)[number];

export const INSPECTION_DAMAGE_TYPES = [
  "scratch",
  "dent",
  "paint_damage",
  "crack",
  "rust",
  "panel_damage",
  "glass_damage",
  "mechanical_damage",
  "electrical_damage",
  "accident_damage",
  "wear_and_tear",
  "other",
] as const;

export type InspectionDamageType = (typeof INSPECTION_DAMAGE_TYPES)[number];

export const INSPECTION_DAMAGE_LOCATIONS = [
  "front",
  "rear",
  "left_side",
  "right_side",
  "roof",
  "interior",
  "engine_bay",
  "undercarriage",
  "other",
] as const;

export type InspectionDamageLocation = (typeof INSPECTION_DAMAGE_LOCATIONS)[number];

export const INSPECTION_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "inspection_number",
  "status",
  "result",
  "overall_score",
  "submitted_at",
] as const;

export type InspectionSortField = (typeof INSPECTION_SORT_FIELDS)[number];

export const INSPECTION_SECTION_KEYS = [
  "vehicle_identity",
  "exterior",
  "interior",
  "engine",
  "transmission",
  "electrical",
  "air_conditioning",
  "brakes",
  "suspension",
  "steering",
  "tyres_wheels",
  "fluids",
  "lights",
  "safety",
  "undercarriage",
  "accident_damage",
  "road_test",
  "documents",
  "final_assessment",
] as const;

export type InspectionSectionKey = (typeof INSPECTION_SECTION_KEYS)[number];

export type InspectionListItem = {
  id: string;
  inspectionNumber: string;
  inspectionType: InspectionType;
  status: InspectionStatus;
  result: InspectionResult | null;
  overallScore: number | null;
  branchId: string;
  branchName: string | null;
  vehicleId: string;
  vehicleStockNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVin: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  inspectedBy: string | null;
  inspectedByName: string | null;
  parentInspectionId: string | null;
  criticalFindingsCount: number;
  failedItemsCount: number;
  startedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InspectionSection = {
  id: string;
  inspectionId: string;
  sectionKey: string;
  name: string;
  sortOrder: number;
  isRequired: boolean;
  isCompleted: boolean;
  notes: string | null;
  itemsCompleted: number;
  itemsTotal: number;
};

export type InspectionItem = {
  id: string;
  inspectionId: string;
  sectionId: string | null;
  sectionKey: string | null;
  templateItemId: string | null;
  name: string;
  category: string;
  sortOrder: number;
  isRequired: boolean;
  result: InspectionItemResult | null;
  severity: InspectionSeverity | null;
  notes: string | null;
};

export type InspectionFinding = {
  id: string;
  inspectionId: string;
  inspectionItemId: string | null;
  sectionId: string | null;
  result: InspectionItemResult;
  severity: InspectionSeverity;
  title: string;
  description: string | null;
  recommendedAction: string | null;
  recommendation: InspectionRecommendation | null;
  /** Present only when caller has inspection.cost.view */
  estimatedCost?: number | null;
  currency: string;
  damageType: InspectionDamageType | null;
  damageLocation: InspectionDamageLocation | null;
  isCritical: boolean;
  isResolved: boolean;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InspectionPhoto = {
  id: string;
  inspectionId: string;
  inspectionItemId: string | null;
  sectionId: string | null;
  findingId: string | null;
  category: InspectionPhotoCategory;
  storagePath: string;
  caption: string | null;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: string;
  signedUrl?: string | null;
};

export type InspectionRecommendationRow = {
  id: string;
  inspectionId: string;
  findingId: string | null;
  recommendation: InspectionRecommendation;
  priority: string | null;
  notes: string | null;
  /** Present only when caller has inspection.cost.view */
  estimatedCost?: number | null;
  currency: string;
  createdBy: string | null;
  createdAt: string;
};

export type InspectionStatusHistoryItem = {
  id: string;
  inspectionId: string;
  fromStatus: InspectionStatus | null;
  toStatus: InspectionStatus;
  reason: string | null;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
};

export type InspectionActivityItem = {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type InspectionProgress = {
  sectionsCompleted: number;
  sectionsTotal: number;
  itemsCompleted: number;
  itemsTotal: number;
  itemsRemaining: number;
  failedItems: number;
  advisoryItems: number;
  criticalFindings: number;
  photosCount: number;
  estimatedRepairsTotal: number | null;
};

export type InspectionDetail = InspectionListItem & {
  templateId: string | null;
  templateName: string | null;
  odometerReading: number | null;
  odometerUnit: string;
  vehicleMileage: number | null;
  summary: string | null;
  recommendation: InspectionRecommendation | null;
  notes: string | null;
  vinVerified: boolean | null;
  vinMismatch: boolean | null;
  verifiedVin: string | null;
  assignedAt: string | null;
  assignedBy: string | null;
  assignedByName: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  reviewNote: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  progress: InspectionProgress;
  sections: InspectionSection[];
  items: InspectionItem[];
  findings: InspectionFinding[];
  photos: InspectionPhoto[];
  recommendations: InspectionRecommendationRow[];
};

export type InspectionSummary = {
  pending: number;
  myInspections: number;
  inProgress: number;
  awaitingReview: number;
  approved: number;
  rejected: number;
  criticalFindings: number;
  total: number;
};

export type InspectionListResult = {
  items: InspectionListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: InspectionSummary;
};

export type InspectionTemplateMeta = {
  id: string;
  name: string;
  description: string | null;
  inspectionType: InspectionType;
  isActive: boolean;
};

export type InspectionMeta = {
  branches: { id: string; name: string; code: string }[];
  templates: InspectionTemplateMeta[];
  inspectors: { id: string; name: string }[];
  vehicles: {
    id: string;
    stockNumber: string;
    make: string;
    model: string;
    year: number;
    vin: string | null;
    mileage: number;
    branchId: string;
    status: string;
  }[];
  statuses: readonly InspectionStatus[];
  types: readonly InspectionType[];
  results: readonly InspectionResult[];
  itemResults: readonly InspectionItemResult[];
  severities: readonly InspectionSeverity[];
  recommendations: readonly InspectionRecommendation[];
  photoCategories: readonly InspectionPhotoCategory[];
  damageTypes: readonly InspectionDamageType[];
  damageLocations: readonly InspectionDamageLocation[];
};

export type VehicleInspectionSummary = {
  id: string;
  inspectionNumber: string;
  status: InspectionStatus;
  result: InspectionResult | null;
  overallScore: number | null;
  criticalFindingsCount: number;
  inspectedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};
