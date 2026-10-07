/** finance domain. PostgreSQL names are preserved; TypeScript fields use camelCase. */
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
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./identity";
import { branches } from "./branches";
import { customers } from "./crm";
import { sales } from "./sales";
import { invoiceStatus, paymentMethod, paymentStatus } from "./enums";

export const payments = pgTable(
  "payments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    paymentNumber: text("payment_number").notNull(),
    saleId: uuid("sale_id"),
    customerId: uuid("customer_id").notNull(),
    branchId: uuid("branch_id"),
    amount: numeric({ precision: 14, scale: 2 }).notNull(),
    currency: char({ length: 3 }).default("AED").notNull(),
    method: paymentMethod().notNull(),
    status: paymentStatus().default("pending").notNull(),
    referenceNumber: text("reference_number"),
    paymentDate: date("payment_date")
      .default(sql`(timezone('utc'::text, now()))::date`)
      .notNull(),
    notes: text(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("payments_customer_id_idx").using(
      "btree",
      table.customerId.asc().nullsLast().op("uuid_ops"),
    ),
    index("payments_sale_id_idx").using("btree", table.saleId.asc().nullsLast().op("uuid_ops")),
    index("payments_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    foreignKey({
      columns: [table.branchId],
      foreignColumns: [branches.id],
      name: "payments_branch_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "payments_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "payments_customer_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.saleId],
      foreignColumns: [sales.id],
      name: "payments_sale_id_fkey",
    }).onDelete("restrict"),
    unique("payments_number_unique").on(table.paymentNumber),
    pgPolicy("payments_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`has_permission_for_optional_branch('payment.view'::text, branch_id)`,
    }),
    pgPolicy("payments_insert", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
      withCheck: sql`has_permission_for_optional_branch('payment.create'::text, branch_id)`,
    }),
    pgPolicy("payments_update", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`(has_permission_for_optional_branch('payment.create'::text, branch_id) OR has_permission_for_optional_branch('payment.refund'::text, branch_id))`,
      withCheck: sql`(has_permission_for_optional_branch('payment.create'::text, branch_id) OR has_permission_for_optional_branch('payment.refund'::text, branch_id))`,
    }),
    check("payments_amount_positive", sql`amount > (0)::numeric`),
    check("payments_currency_format", sql`currency ~ '^[A-Z]{3}$'::text`),
  ],
).enableRLS();

export const paymentAllocations = pgTable(
  "payment_allocations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    paymentId: uuid("payment_id").notNull(),
    saleId: uuid("sale_id").notNull(),
    amount: numeric({ precision: 14, scale: 2 }).notNull(),
    currency: char({ length: 3 }).default("AED").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("payment_allocations_sale_id_idx").using(
      "btree",
      table.saleId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.paymentId],
      foreignColumns: [payments.id],
      name: "payment_allocations_payment_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.saleId],
      foreignColumns: [sales.id],
      name: "payment_allocations_sale_id_fkey",
    }).onDelete("restrict"),
    unique("payment_allocations_unique_sale").on(table.paymentId, table.saleId),
    pgPolicy("payment_allocations_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND has_permission_for_optional_branch('payment.view'::text, p.branch_id))))`,
    }),
    pgPolicy("payment_allocations_mutate", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND has_permission_for_optional_branch('payment.create'::text, p.branch_id))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND has_permission_for_optional_branch('payment.create'::text, p.branch_id))))`,
    }),
    check("payment_allocations_amount_positive", sql`amount > (0)::numeric`),
    check("payment_allocations_currency_format", sql`currency ~ '^[A-Z]{3}$'::text`),
  ],
).enableRLS();

export const taxRates = pgTable(
  "tax_rates",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    rate: numeric({ precision: 8, scale: 4 }).notNull(),
    country: char({ length: 2 }).default("AE").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    effectiveFrom: date("effective_from")
      .default(sql`(timezone('utc'::text, now()))::date`)
      .notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (): PgTableExtraConfigValue[] => [
    pgPolicy("tax_rates_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(has_permission('invoice.view'::text) OR has_permission('sale.view'::text) OR has_permission('payment.view'::text))`,
    }),
    check(
      "tax_rates_effective_window",
      sql`(effective_to IS NULL) OR (effective_to >= effective_from)`,
    ),
    check("tax_rates_name_not_blank", sql`length(TRIM(BOTH FROM name)) > 0`),
    check("tax_rates_rate_non_negative", sql`rate >= (0)::numeric`),
  ],
).enableRLS();

export const invoices = pgTable(
  "invoices",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    invoiceNumber: text("invoice_number").notNull(),
    saleId: uuid("sale_id"),
    customerId: uuid("customer_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    taxRateId: uuid("tax_rate_id"),
    invoiceDate: date("invoice_date")
      .default(sql`(timezone('utc'::text, now()))::date`)
      .notNull(),
    subtotal: numeric({ precision: 14, scale: 2 }).notNull(),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }).default("0").notNull(),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0").notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    currency: char({ length: 3 }).default("AED").notNull(),
    status: invoiceStatus().default("draft").notNull(),
    notes: text(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    index("invoices_customer_id_idx").using(
      "btree",
      table.customerId.asc().nullsLast().op("uuid_ops"),
    ),
    index("invoices_sale_id_idx").using("btree", table.saleId.asc().nullsLast().op("uuid_ops")),
    index("invoices_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    foreignKey({
      columns: [table.branchId],
      foreignColumns: [branches.id],
      name: "invoices_branch_id_fkey",
    }),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "invoices_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "invoices_customer_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.saleId],
      foreignColumns: [sales.id],
      name: "invoices_sale_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.taxRateId],
      foreignColumns: [taxRates.id],
      name: "invoices_tax_rate_id_fkey",
    }).onDelete("set null"),
    unique("invoices_number_unique").on(table.invoiceNumber),
    pgPolicy("invoices_update", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
      using: sql`has_permission_for_branch('invoice.edit'::text, branch_id)`,
      withCheck: sql`has_permission_for_branch('invoice.edit'::text, branch_id)`,
    }),
    pgPolicy("invoices_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`has_permission_for_branch('invoice.view'::text, branch_id)`,
    }),
    pgPolicy("invoices_insert", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
      withCheck: sql`has_permission_for_branch('invoice.create'::text, branch_id)`,
    }),
    check("invoices_currency_format", sql`currency ~ '^[A-Z]{3}$'::text`),
    check("invoices_discount_non_negative", sql`discount_amount >= (0)::numeric`),
    check("invoices_subtotal_non_negative", sql`subtotal >= (0)::numeric`),
    check("invoices_tax_non_negative", sql`tax_amount >= (0)::numeric`),
    check("invoices_total_non_negative", sql`total_amount >= (0)::numeric`),
  ],
).enableRLS();
