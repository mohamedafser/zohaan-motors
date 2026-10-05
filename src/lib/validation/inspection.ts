import { z } from "zod";

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

const messages = {
  required: "validation.required",
  number: "validation.number",
  currency: "validation.currency",
} as const;

const optionalText = z
  .union([z.string(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed.length === 0 ? null : trimmed;
  });

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const trimmed = String(value).trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
    return trimmed;
  })
  .pipe(z.union([z.string().uuid(), z.null()]));

const moneySchema = z
  .union([z.number(), z.nan(), z.null(), z.undefined(), z.string()])
  .transform((value) => {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  })
  .refine((value) => value === null || value >= 0, { error: messages.currency });

const odometerSchema = z
  .union([z.number(), z.nan(), z.null(), z.undefined(), z.string()])
  .transform((value) => {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  })
  .refine((value) => value === null || value >= 0, { error: messages.number });

const scoreSchema = z
  .union([z.number(), z.nan(), z.null(), z.undefined(), z.string()])
  .transform((value) => {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  })
  .refine((value) => value === null || (value >= 0 && value <= 100), {
    error: messages.number,
  });

export const createInspectionSchema = z.object({
  vehicleId: z.string().uuid({ error: messages.required }),
  branchId: optionalUuid,
  templateId: optionalUuid,
  inspectionType: z.enum(INSPECTION_TYPES).default("full_inspection"),
  assignedTo: optionalUuid,
  odometerReading: odometerSchema,
  odometerUnit: z
    .union([z.string(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null || value === "") return "KM";
      return String(value).trim().toUpperCase() || "KM";
    }),
  notes: optionalText,
  parentInspectionId: optionalUuid,
});

export const updateInspectionSchema = z.object({
  inspectionType: z.enum(INSPECTION_TYPES).optional(),
  odometerReading: odometerSchema.optional(),
  odometerUnit: z.string().trim().min(1).optional(),
  notes: optionalText.optional(),
  summary: optionalText.optional(),
  recommendation: z
    .union([z.enum(INSPECTION_RECOMMENDATIONS), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value && String(value).length > 0 ? value : null))
    .optional(),
  overallScore: scoreSchema.optional(),
  result: z
    .union([z.enum(INSPECTION_RESULTS), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value && String(value).length > 0 ? value : null))
    .optional(),
  vinVerified: z.boolean().optional(),
  vinMismatch: z.boolean().optional(),
  verifiedVin: optionalText.optional(),
});

export const saveInspectionDraftSchema = z.object({
  odometerReading: odometerSchema.optional(),
  odometerUnit: z.string().trim().min(1).optional(),
  notes: optionalText.optional(),
  summary: optionalText.optional(),
  recommendation: z
    .union([z.enum(INSPECTION_RECOMMENDATIONS), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value && String(value).length > 0 ? value : null))
    .optional(),
  overallScore: scoreSchema.optional(),
  result: z
    .union([z.enum(INSPECTION_RESULTS), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value && String(value).length > 0 ? value : null))
    .optional(),
  vinVerified: z.boolean().optional(),
  vinMismatch: z.boolean().optional(),
  verifiedVin: optionalText.optional(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        result: z
          .union([z.enum(INSPECTION_ITEM_RESULTS), z.literal(""), z.null(), z.undefined()])
          .transform((value) => (value && String(value).length > 0 ? value : null)),
        severity: z
          .union([z.enum(INSPECTION_SEVERITIES), z.literal(""), z.null(), z.undefined()])
          .transform((value) => (value && String(value).length > 0 ? value : null)),
        notes: optionalText,
      }),
    )
    .optional(),
  sections: z
    .array(
      z.object({
        id: z.string().uuid(),
        isCompleted: z.boolean().optional(),
        notes: optionalText,
      }),
    )
    .optional(),
});

export const assignInspectionSchema = z.object({
  assignedTo: z.string().uuid({ error: messages.required }),
  reason: optionalText,
});

export const changeInspectionStatusSchema = z.object({
  status: z.enum(INSPECTION_STATUSES),
  reason: z.string().trim().min(1, { error: messages.required }),
});

export const submitInspectionSchema = z.object({
  result: z.enum(INSPECTION_RESULTS).optional(),
  overallScore: scoreSchema.optional(),
  summary: optionalText.optional(),
  recommendation: z
    .union([z.enum(INSPECTION_RECOMMENDATIONS), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value && String(value).length > 0 ? value : null))
    .optional(),
  notes: optionalText.optional(),
  overrideIncomplete: z.boolean().optional().default(false),
});

export const approveInspectionSchema = z.object({
  note: optionalText,
  overrideCritical: z.boolean().optional().default(false),
});

export const rejectInspectionSchema = z.object({
  reason: z.string().trim().min(1, { error: messages.required }),
});

export const cancelInspectionSchema = z.object({
  reason: z.string().trim().min(1, { error: messages.required }),
});

export const reinspectSchema = z.object({
  reason: z.string().trim().min(1, { error: messages.required }),
  assignedTo: optionalUuid,
});

export const inspectionFindingSchema = z.object({
  inspectionItemId: optionalUuid,
  sectionId: optionalUuid,
  result: z.enum(INSPECTION_ITEM_RESULTS),
  severity: z.enum(INSPECTION_SEVERITIES),
  title: z.string().trim().min(1, { error: messages.required }),
  description: optionalText,
  recommendedAction: optionalText,
  recommendation: z
    .union([z.enum(INSPECTION_RECOMMENDATIONS), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value && String(value).length > 0 ? value : null)),
  estimatedCost: moneySchema,
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("AED"),
  damageType: z
    .union([z.enum(INSPECTION_DAMAGE_TYPES), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value && String(value).length > 0 ? value : null)),
  damageLocation: z
    .union([z.enum(INSPECTION_DAMAGE_LOCATIONS), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value && String(value).length > 0 ? value : null)),
  isResolved: z.boolean().optional(),
});

export const updateInspectionFindingSchema = inspectionFindingSchema.partial().extend({
  title: z.string().trim().min(1, { error: messages.required }).optional(),
  result: z.enum(INSPECTION_ITEM_RESULTS).optional(),
  severity: z.enum(INSPECTION_SEVERITIES).optional(),
});

export const inspectionPhotoSchema = z.object({
  storagePath: z.string().trim().min(1, { error: messages.required }),
  category: z.enum(INSPECTION_PHOTO_CATEGORIES).default("other"),
  caption: optionalText,
  inspectionItemId: optionalUuid,
  sectionId: optionalUuid,
  findingId: optionalUuid,
});

export const inspectionListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  status: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.enum(INSPECTION_STATUSES).optional(),
  ),
  inspectionType: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.enum(INSPECTION_TYPES).optional(),
  ),
  result: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.enum(INSPECTION_RESULTS).optional(),
  ),
  branchId: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.string().uuid().optional(),
  ),
  assignedTo: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.string().uuid().optional(),
  ),
  inspectedBy: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.string().uuid().optional(),
  ),
  vehicleId: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.string().uuid().optional(),
  ),
  mine: z.preprocess((value) => {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return undefined;
  }, z.boolean().optional()),
  hasCritical: z.preprocess((value) => {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return undefined;
  }, z.boolean().optional()),
  repairRequired: z.preprocess((value) => {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return undefined;
  }, z.boolean().optional()),
  dateFrom: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  dateTo: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  sort: z.enum(INSPECTION_SORT_FIELDS).default("updated_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [25, 50, 100].includes(value), { error: messages.number })
    .default(25),
});

export type CreateInspectionValues = z.infer<typeof createInspectionSchema>;
export type UpdateInspectionValues = z.infer<typeof updateInspectionSchema>;
export type SaveInspectionDraftValues = z.infer<typeof saveInspectionDraftSchema>;
export type AssignInspectionValues = z.infer<typeof assignInspectionSchema>;
export type ChangeInspectionStatusValues = z.infer<typeof changeInspectionStatusSchema>;
export type SubmitInspectionValues = z.infer<typeof submitInspectionSchema>;
export type ApproveInspectionValues = z.infer<typeof approveInspectionSchema>;
export type RejectInspectionValues = z.infer<typeof rejectInspectionSchema>;
export type CancelInspectionValues = z.infer<typeof cancelInspectionSchema>;
export type ReinspectValues = z.infer<typeof reinspectSchema>;
export type InspectionFindingValues = z.infer<typeof inspectionFindingSchema>;
export type UpdateInspectionFindingValues = z.infer<typeof updateInspectionFindingSchema>;
export type InspectionPhotoValues = z.infer<typeof inspectionPhotoSchema>;
export type InspectionListQuery = z.infer<typeof inspectionListQuerySchema>;
