/** inspections domain. PostgreSQL names are preserved; TypeScript fields use camelCase. */
import {
  type PgTableExtraConfigValue,
  pgTable,
  foreignKey,
  unique,
  pgPolicy,
  check,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  numeric,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./identity";
import { branches } from "./branches";
import { vehicles } from "./inventory";
import {
  inspectionDamageLocation,
  inspectionDamageType,
  inspectionItemResult,
  inspectionPhotoCategory,
  inspectionRecommendation,
  inspectionResult,
  inspectionSeverity,
  inspectionStatus,
  inspectionType,
} from "./enums";

export const inspections = pgTable(
  "inspections",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    vehicleId: uuid("vehicle_id").notNull(),
    templateId: uuid("template_id"),
    branchId: uuid("branch_id").notNull(),
    inspectorId: uuid("inspector_id"),
    status: inspectionStatus().default("draft").notNull(),
    result: inspectionResult(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    notes: text(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    inspectionNumber: text("inspection_number").notNull(),
    inspectionType: inspectionType("inspection_type").default("full_inspection").notNull(),
    assignedTo: uuid("assigned_to"),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "string" }),
    assignedBy: uuid("assigned_by"),
    inspectedBy: uuid("inspected_by"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "string" }),
    overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
    odometerReading: numeric("odometer_reading"),
    odometerUnit: text("odometer_unit").default("KM").notNull(),
    summary: text(),
    recommendation: inspectionRecommendation(),
    parentInspectionId: uuid("parent_inspection_id"),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "string" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: "string" }),
    rejectionReason: text("rejection_reason"),
    cancelReason: text("cancel_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "string" }),
    reviewNote: text("review_note"),
    vinVerified: boolean("vin_verified"),
    vinMismatch: boolean("vin_mismatch"),
    verifiedVin: text("verified_vin"),
    updatedBy: uuid("updated_by"),
  },
  (table): PgTableExtraConfigValue[] => [
    index("inspections_assigned_to_idx").using(
      "btree",
      table.assignedTo.asc().nullsLast().op("uuid_ops"),
    ),
    index("inspections_branch_id_idx").using(
      "btree",
      table.branchId.asc().nullsLast().op("uuid_ops"),
    ),
    index("inspections_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("inspections_inspected_by_idx").using(
      "btree",
      table.inspectedBy.asc().nullsLast().op("uuid_ops"),
    ),
    uniqueIndex("inspections_inspection_number_unique").using(
      "btree",
      table.inspectionNumber.asc().nullsLast().op("text_ops"),
    ),
    index("inspections_inspection_type_idx").using(
      "btree",
      table.inspectionType.asc().nullsLast().op("enum_ops"),
    ),
    index("inspections_parent_inspection_id_idx").using(
      "btree",
      table.parentInspectionId.asc().nullsLast().op("uuid_ops"),
    ),
    index("inspections_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    index("inspections_submitted_at_idx").using(
      "btree",
      table.submittedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("inspections_updated_at_idx").using(
      "btree",
      table.updatedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("inspections_vehicle_id_idx").using(
      "btree",
      table.vehicleId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.assignedBy],
      foreignColumns: [profiles.id],
      name: "inspections_assigned_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [profiles.id],
      name: "inspections_assigned_to_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.branchId],
      foreignColumns: [branches.id],
      name: "inspections_branch_id_fkey",
    }),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "inspections_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.inspectedBy],
      foreignColumns: [profiles.id],
      name: "inspections_inspected_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.inspectorId],
      foreignColumns: [profiles.id],
      name: "inspections_inspector_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.parentInspectionId],
      foreignColumns: [table.id],
      name: "inspections_parent_inspection_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.reviewedBy],
      foreignColumns: [profiles.id],
      name: "inspections_reviewed_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [inspectionTemplates.id],
      name: "inspections_template_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "inspections_updated_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.vehicleId],
      foreignColumns: [vehicles.id],
      name: "inspections_vehicle_id_fkey",
    }).onDelete("restrict"),
    pgPolicy("inspections_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`has_permission_for_branch('inspection.view'::text, branch_id)`,
    }),
    pgPolicy("inspections_insert", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
      withCheck: sql`has_permission_for_branch('inspection.create'::text, branch_id)`,
    }),
    pgPolicy("inspections_update", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`(has_permission_for_branch('inspection.edit'::text, branch_id) OR has_permission_for_branch('inspection.approve'::text, branch_id) OR has_permission_for_branch('inspection.submit'::text, branch_id) OR has_permission_for_branch('inspection.review'::text, branch_id) OR has_permission_for_branch('inspection.reject'::text, branch_id))`,
      withCheck: sql`(has_permission_for_branch('inspection.edit'::text, branch_id) OR has_permission_for_branch('inspection.approve'::text, branch_id) OR has_permission_for_branch('inspection.submit'::text, branch_id) OR has_permission_for_branch('inspection.review'::text, branch_id) OR has_permission_for_branch('inspection.reject'::text, branch_id))`,
    }),
    check(
      "inspections_completed_after_started",
      sql`(completed_at IS NULL) OR (started_at IS NULL) OR (completed_at >= started_at)`,
    ),
    check(
      "inspections_odometer_non_negative",
      sql`(odometer_reading IS NULL) OR (odometer_reading >= (0)::numeric)`,
    ),
    check("inspections_odometer_unit_not_blank", sql`length(TRIM(BOTH FROM odometer_unit)) > 0`),
    check(
      "inspections_overall_score_range",
      sql`(overall_score IS NULL) OR ((overall_score >= (0)::numeric) AND (overall_score <= (100)::numeric))`,
    ),
    check(
      "inspections_submitted_after_started",
      sql`(submitted_at IS NULL) OR (started_at IS NULL) OR (submitted_at >= started_at)`,
    ),
  ],
).enableRLS();

export const inspectionTemplates = pgTable(
  "inspection_templates",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    inspectionType: inspectionType("inspection_type").default("full_inspection").notNull(),
  },
  (): PgTableExtraConfigValue[] => [
    pgPolicy("inspection_templates_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(has_permission('inspection.view'::text) OR has_permission('inspection.create'::text))`,
    }),
    check("inspection_templates_name_not_blank", sql`length(TRIM(BOTH FROM name)) > 0`),
  ],
).enableRLS();

export const inspectionTemplateItems = pgTable(
  "inspection_template_items",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    templateId: uuid("template_id").notNull(),
    name: text().notNull(),
    category: text().notNull(),
    description: text(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isRequired: boolean("is_required").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    sectionKey: text("section_key").notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("inspection_template_items_section_key_idx").using(
      "btree",
      table.templateId.asc().nullsLast().op("uuid_ops"),
      table.sectionKey.asc().nullsLast().op("text_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [inspectionTemplates.id],
      name: "inspection_template_items_template_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("inspection_template_items_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(has_permission('inspection.view'::text) OR has_permission('inspection.create'::text))`,
    }),
    check(
      "inspection_template_items_category_not_blank",
      sql`length(TRIM(BOTH FROM category)) > 0`,
    ),
    check("inspection_template_items_name_not_blank", sql`length(TRIM(BOTH FROM name)) > 0`),
  ],
).enableRLS();

export const inspectionItems = pgTable(
  "inspection_items",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    inspectionId: uuid("inspection_id").notNull(),
    templateItemId: uuid("template_item_id"),
    name: text().notNull(),
    category: text().notNull(),
    result: inspectionItemResult(),
    notes: text(),
    severity: inspectionSeverity(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    sectionId: uuid("section_id"),
    sectionKey: text("section_key"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isRequired: boolean("is_required").default(true).notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("inspection_items_section_id_idx").using(
      "btree",
      table.sectionId.asc().nullsLast().op("uuid_ops"),
    ),
    index("inspection_items_section_key_idx").using(
      "btree",
      table.inspectionId.asc().nullsLast().op("uuid_ops"),
      table.sectionKey.asc().nullsLast().op("text_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.inspectionId],
      foreignColumns: [inspections.id],
      name: "inspection_items_inspection_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.sectionId],
      foreignColumns: [inspectionSections.id],
      name: "inspection_items_section_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.templateItemId],
      foreignColumns: [inspectionTemplateItems.id],
      name: "inspection_items_template_item_id_fkey",
    }).onDelete("set null"),
    pgPolicy("inspection_items_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_items.inspection_id) AND has_permission_for_branch('inspection.view'::text, i.branch_id))))`,
    }),
    pgPolicy("inspection_items_mutate", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_items.inspection_id) AND has_permission_for_branch('inspection.edit'::text, i.branch_id))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_items.inspection_id) AND has_permission_for_branch('inspection.edit'::text, i.branch_id))))`,
    }),
    check("inspection_items_name_not_blank", sql`length(TRIM(BOTH FROM name)) > 0`),
  ],
).enableRLS();

export const inspectionPhotos = pgTable(
  "inspection_photos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    inspectionId: uuid("inspection_id").notNull(),
    inspectionItemId: uuid("inspection_item_id"),
    storagePath: text("storage_path").notNull(),
    caption: text(),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    sectionId: uuid("section_id"),
    findingId: uuid("finding_id"),
    category: inspectionPhotoCategory().default("other").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("inspection_photos_finding_id_idx").using(
      "btree",
      table.findingId.asc().nullsLast().op("uuid_ops"),
    ),
    index("inspection_photos_inspection_id_idx").using(
      "btree",
      table.inspectionId.asc().nullsLast().op("uuid_ops"),
    ),
    index("inspection_photos_section_id_idx").using(
      "btree",
      table.sectionId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.findingId],
      foreignColumns: [inspectionFindings.id],
      name: "inspection_photos_finding_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.inspectionId],
      foreignColumns: [inspections.id],
      name: "inspection_photos_inspection_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.inspectionItemId],
      foreignColumns: [inspectionItems.id],
      name: "inspection_photos_inspection_item_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.sectionId],
      foreignColumns: [inspectionSections.id],
      name: "inspection_photos_section_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [profiles.id],
      name: "inspection_photos_uploaded_by_fkey",
    }).onDelete("set null"),
    pgPolicy("inspection_photos_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_photos.inspection_id) AND (has_permission_for_branch('inspection.photo.view'::text, i.branch_id) OR has_permission_for_branch('inspection.view'::text, i.branch_id)))))`,
    }),
    pgPolicy("inspection_photos_insert", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
      withCheck: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_photos.inspection_id) AND (has_permission_for_branch('inspection.photo.create'::text, i.branch_id) OR has_permission_for_branch('inspection.edit'::text, i.branch_id) OR has_permission_for_branch('inspection.create'::text, i.branch_id)))))`,
    }),
    pgPolicy("inspection_photos_update", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_photos.inspection_id) AND (has_permission_for_branch('inspection.photo.create'::text, i.branch_id) OR has_permission_for_branch('inspection.edit'::text, i.branch_id)))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_photos.inspection_id) AND (has_permission_for_branch('inspection.photo.create'::text, i.branch_id) OR has_permission_for_branch('inspection.edit'::text, i.branch_id)))))`,
    }),
    pgPolicy("inspection_photos_delete", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_photos.inspection_id) AND (has_permission_for_branch('inspection.photo.delete'::text, i.branch_id) OR has_permission_for_branch('inspection.edit'::text, i.branch_id)))))`,
    }),
    check(
      "inspection_photos_storage_path_not_blank",
      sql`length(TRIM(BOTH FROM storage_path)) > 0`,
    ),
  ],
).enableRLS();

export const inspectionFindings = pgTable(
  "inspection_findings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    inspectionId: uuid("inspection_id").notNull(),
    inspectionItemId: uuid("inspection_item_id"),
    sectionId: uuid("section_id"),
    result: inspectionItemResult().default("fail").notNull(),
    severity: inspectionSeverity().default("moderate").notNull(),
    title: text().notNull(),
    description: text(),
    recommendedAction: text("recommended_action"),
    recommendation: inspectionRecommendation(),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 2 }),
    currency: text().default("AED").notNull(),
    damageType: inspectionDamageType("damage_type"),
    damageLocation: inspectionDamageLocation("damage_location"),
    isCritical: boolean("is_critical").generatedAlwaysAs(
      sql`(severity = 'critical'::inspection_severity)`,
    ),
    isResolved: boolean("is_resolved").default(false).notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("inspection_findings_critical_idx")
      .using("btree", table.inspectionId.asc().nullsLast().op("uuid_ops"))
      .where(sql`((severity = 'critical'::inspection_severity) AND (is_resolved = false))`),
    index("inspection_findings_inspection_id_idx").using(
      "btree",
      table.inspectionId.asc().nullsLast().op("uuid_ops"),
    ),
    index("inspection_findings_result_idx").using(
      "btree",
      table.inspectionId.asc().nullsLast().op("uuid_ops"),
      table.result.asc().nullsLast().op("enum_ops"),
    ),
    index("inspection_findings_severity_idx").using(
      "btree",
      table.inspectionId.asc().nullsLast().op("uuid_ops"),
      table.severity.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "inspection_findings_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.inspectionId],
      foreignColumns: [inspections.id],
      name: "inspection_findings_inspection_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.inspectionItemId],
      foreignColumns: [inspectionItems.id],
      name: "inspection_findings_inspection_item_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.sectionId],
      foreignColumns: [inspectionSections.id],
      name: "inspection_findings_section_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "inspection_findings_updated_by_fkey",
    }).onDelete("set null"),
    pgPolicy("inspection_findings_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_findings.inspection_id) AND (has_permission_for_branch('inspection.finding.view'::text, i.branch_id) OR has_permission_for_branch('inspection.view'::text, i.branch_id)))))`,
    }),
    pgPolicy("inspection_findings_insert", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
      withCheck: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_findings.inspection_id) AND (has_permission_for_branch('inspection.finding.create'::text, i.branch_id) OR has_permission_for_branch('inspection.edit'::text, i.branch_id)))))`,
    }),
    pgPolicy("inspection_findings_update", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_findings.inspection_id) AND (has_permission_for_branch('inspection.finding.edit'::text, i.branch_id) OR has_permission_for_branch('inspection.edit'::text, i.branch_id)))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_findings.inspection_id) AND (has_permission_for_branch('inspection.finding.edit'::text, i.branch_id) OR has_permission_for_branch('inspection.edit'::text, i.branch_id)))))`,
    }),
    pgPolicy("inspection_findings_delete", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_findings.inspection_id) AND (has_permission_for_branch('inspection.finding.edit'::text, i.branch_id) OR has_permission_for_branch('inspection.edit'::text, i.branch_id)))))`,
    }),
    check("inspection_findings_currency_format", sql`currency ~ '^[A-Z]{3}$'::text`),
    check(
      "inspection_findings_estimated_cost_non_negative",
      sql`(estimated_cost IS NULL) OR (estimated_cost >= (0)::numeric)`,
    ),
    check("inspection_findings_title_not_blank", sql`length(TRIM(BOTH FROM title)) > 0`),
  ],
).enableRLS();

export const inspectionRecommendations = pgTable(
  "inspection_recommendations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    inspectionId: uuid("inspection_id").notNull(),
    findingId: uuid("finding_id"),
    recommendation: inspectionRecommendation().notNull(),
    priority: text(),
    notes: text(),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 2 }),
    currency: text().default("AED").notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("inspection_recommendations_inspection_id_idx").using(
      "btree",
      table.inspectionId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "inspection_recommendations_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.findingId],
      foreignColumns: [inspectionFindings.id],
      name: "inspection_recommendations_finding_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.inspectionId],
      foreignColumns: [inspections.id],
      name: "inspection_recommendations_inspection_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("inspection_recommendations_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_recommendations.inspection_id) AND has_permission_for_branch('inspection.view'::text, i.branch_id))))`,
    }),
    pgPolicy("inspection_recommendations_mutate", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_recommendations.inspection_id) AND has_permission_for_branch('inspection.edit'::text, i.branch_id))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_recommendations.inspection_id) AND has_permission_for_branch('inspection.edit'::text, i.branch_id))))`,
    }),
    check("inspection_recommendations_currency_format", sql`currency ~ '^[A-Z]{3}$'::text`),
    check(
      "inspection_recommendations_estimated_cost_non_negative",
      sql`(estimated_cost IS NULL) OR (estimated_cost >= (0)::numeric)`,
    ),
  ],
).enableRLS();

export const inspectionSections = pgTable(
  "inspection_sections",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    inspectionId: uuid("inspection_id").notNull(),
    sectionKey: text("section_key").notNull(),
    name: text().notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isRequired: boolean("is_required").default(true).notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("inspection_sections_inspection_id_idx").using(
      "btree",
      table.inspectionId.asc().nullsLast().op("uuid_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.inspectionId],
      foreignColumns: [inspections.id],
      name: "inspection_sections_inspection_id_fkey",
    }).onDelete("cascade"),
    unique("inspection_sections_unique_key").on(table.inspectionId, table.sectionKey),
    pgPolicy("inspection_sections_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_sections.inspection_id) AND has_permission_for_branch('inspection.view'::text, i.branch_id))))`,
    }),
    pgPolicy("inspection_sections_mutate", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_sections.inspection_id) AND has_permission_for_branch('inspection.edit'::text, i.branch_id))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_sections.inspection_id) AND has_permission_for_branch('inspection.edit'::text, i.branch_id))))`,
    }),
    check("inspection_sections_name_not_blank", sql`length(TRIM(BOTH FROM name)) > 0`),
    check(
      "inspection_sections_section_key_not_blank",
      sql`length(TRIM(BOTH FROM section_key)) > 0`,
    ),
  ],
).enableRLS();

export const inspectionStatusHistory = pgTable(
  "inspection_status_history",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    inspectionId: uuid("inspection_id").notNull(),
    fromStatus: inspectionStatus("from_status"),
    toStatus: inspectionStatus("to_status").notNull(),
    reason: text(),
    changedBy: uuid("changed_by"),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("inspection_status_history_inspection_id_idx").using(
      "btree",
      table.inspectionId.asc().nullsLast().op("uuid_ops"),
      table.changedAt.desc().nullsFirst().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.changedBy],
      foreignColumns: [profiles.id],
      name: "inspection_status_history_changed_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.inspectionId],
      foreignColumns: [inspections.id],
      name: "inspection_status_history_inspection_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("inspection_status_history_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM inspections i
  WHERE ((i.id = inspection_status_history.inspection_id) AND has_permission_for_branch('inspection.view'::text, i.branch_id))))`,
    }),
  ],
).enableRLS();
