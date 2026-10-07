/** crm domain. PostgreSQL names are preserved; TypeScript fields use camelCase. */
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
  char,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./identity";
import { branches } from "./branches";
import { vehicles } from "./inventory";
import { leadActivityType, leadStatus, preferredLanguage, uaeEmirate } from "./enums";

export const customers = pgTable(
  "customers",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    customerCode: text("customer_code").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    displayName: text("display_name").notNull(),
    phone: text().notNull(),
    email: text(),
    nationality: text(),
    emirate: uaeEmirate(),
    city: text(),
    address: text(),
    preferredLanguage: preferredLanguage("preferred_language").default("en").notNull(),
    branchId: uuid("branch_id"),
    notes: text(),
    createdBy: uuid("created_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    uniqueIndex("customers_code_active_unique")
      .using("btree", table.customerCode.asc().nullsLast().op("text_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("customers_display_name_trgm_idx").using(
      "gin",
      table.displayName.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("customers_email_idx")
      .using("btree", table.email.asc().nullsLast().op("text_ops"))
      .where(sql`((deleted_at IS NULL) AND (email IS NOT NULL))`),
    uniqueIndex("customers_phone_active_unique")
      .using("btree", table.phone.asc().nullsLast().op("text_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("customers_phone_trgm_idx").using(
      "gin",
      table.phone.asc().nullsLast().op("gin_trgm_ops"),
    ),
    foreignKey({
      columns: [table.branchId],
      foreignColumns: [branches.id],
      name: "customers_branch_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "customers_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.deletedBy],
      foreignColumns: [profiles.id],
      name: "customers_deleted_by_fkey",
    }).onDelete("set null"),
    pgPolicy("customers_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`((deleted_at IS NULL) AND has_permission_for_optional_branch('customer.view'::text, branch_id))`,
    }),
    pgPolicy("customers_insert", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
      withCheck: sql`has_permission_for_optional_branch('customer.create'::text, branch_id)`,
    }),
    pgPolicy("customers_update", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`((deleted_at IS NULL) AND has_permission_for_optional_branch('customer.edit'::text, branch_id))`,
      withCheck: sql`has_permission_for_optional_branch('customer.edit'::text, branch_id)`,
    }),
    check("customers_customer_code_not_blank", sql`length(TRIM(BOTH FROM customer_code)) > 0`),
    check(
      "customers_email_format",
      sql`(email IS NULL) OR (email ~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'::text)`,
    ),
    check("customers_first_name_not_blank", sql`length(TRIM(BOTH FROM first_name)) > 0`),
    check("customers_last_name_not_blank", sql`length(TRIM(BOTH FROM last_name)) > 0`),
    check("customers_phone_not_blank", sql`length(TRIM(BOTH FROM phone)) > 0`),
  ],
).enableRLS();

export const leadSources = pgTable(
  "lead_sources",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    key: text().notNull(),
    name: text().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    unique("lead_sources_key_unique").on(table.key),
    pgPolicy("lead_sources_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(has_permission('lead.view'::text) OR has_permission('lead.create'::text))`,
    }),
    check("lead_sources_name_not_blank", sql`length(TRIM(BOTH FROM name)) > 0`),
  ],
).enableRLS();

export const leads = pgTable(
  "leads",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    leadNumber: text("lead_number").notNull(),
    customerId: uuid("customer_id"),
    vehicleId: uuid("vehicle_id"),
    sourceId: uuid("source_id"),
    branchId: uuid("branch_id").notNull(),
    assignedTo: uuid("assigned_to"),
    status: leadStatus().default("new").notNull(),
    estimatedValue: numeric("estimated_value", { precision: 14, scale: 2 }),
    currency: char({ length: 3 }).default("AED").notNull(),
    notes: text(),
    createdBy: uuid("created_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("leads_assigned_to_idx").using(
      "btree",
      table.assignedTo.asc().nullsLast().op("uuid_ops"),
    ),
    index("leads_branch_id_idx").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
    index("leads_customer_id_idx").using(
      "btree",
      table.customerId.asc().nullsLast().op("uuid_ops"),
    ),
    uniqueIndex("leads_number_active_unique")
      .using("btree", table.leadNumber.asc().nullsLast().op("text_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("leads_status_idx")
      .using("btree", table.status.asc().nullsLast().op("enum_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("leads_vehicle_id_idx").using("btree", table.vehicleId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [profiles.id],
      name: "leads_assigned_to_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.branchId],
      foreignColumns: [branches.id],
      name: "leads_branch_id_fkey",
    }),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "leads_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "leads_customer_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.deletedBy],
      foreignColumns: [profiles.id],
      name: "leads_deleted_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.sourceId],
      foreignColumns: [leadSources.id],
      name: "leads_source_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.vehicleId],
      foreignColumns: [vehicles.id],
      name: "leads_vehicle_id_fkey",
    }).onDelete("set null"),
    pgPolicy("leads_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`((deleted_at IS NULL) AND (has_permission_for_branch('lead.view'::text, branch_id) OR ((assigned_to = auth.uid()) AND has_permission('lead.view'::text))))`,
    }),
    pgPolicy("leads_insert", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
      withCheck: sql`has_permission_for_branch('lead.create'::text, branch_id)`,
    }),
    pgPolicy("leads_update", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`((deleted_at IS NULL) AND (has_permission_for_branch('lead.edit'::text, branch_id) OR ((assigned_to = auth.uid()) AND has_permission('lead.edit'::text))))`,
      withCheck: sql`(has_permission_for_branch('lead.edit'::text, branch_id) OR ((assigned_to = auth.uid()) AND has_permission('lead.edit'::text)))`,
    }),
    check("leads_currency_format", sql`currency ~ '^[A-Z]{3}$'::text`),
    check(
      "leads_estimated_value_non_negative",
      sql`(estimated_value IS NULL) OR (estimated_value >= (0)::numeric)`,
    ),
    check("leads_lead_number_not_blank", sql`length(TRIM(BOTH FROM lead_number)) > 0`),
  ],
).enableRLS();

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    leadId: uuid("lead_id").notNull(),
    activityType: leadActivityType("activity_type").notNull(),
    subject: text(),
    description: text(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "lead_activities_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.leadId],
      foreignColumns: [leads.id],
      name: "lead_activities_lead_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("lead_activities_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM leads l
  WHERE ((l.id = lead_activities.lead_id) AND (l.deleted_at IS NULL) AND (has_permission_for_branch('lead.view'::text, l.branch_id) OR ((l.assigned_to = auth.uid()) AND has_permission('lead.view'::text))))))`,
    }),
    pgPolicy("lead_activities_mutate", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM leads l
  WHERE ((l.id = lead_activities.lead_id) AND (has_permission_for_branch('lead.edit'::text, l.branch_id) OR ((l.assigned_to = auth.uid()) AND has_permission('lead.edit'::text))))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM leads l
  WHERE ((l.id = lead_activities.lead_id) AND (has_permission_for_branch('lead.edit'::text, l.branch_id) OR ((l.assigned_to = auth.uid()) AND has_permission('lead.edit'::text))))))`,
    }),
  ],
).enableRLS();
