import { authUsers } from "drizzle-orm/supabase";
import { relations } from "drizzle-orm/relations";
import {
  profiles,
  branches,
  acquisitions,
  vehicleExpenses,
  documents,
  vehicles,
  vehiclePriceHistory,
  vehicleStatusHistory,
  vehiclePhotos,
  emailVerificationOtps,
  customers,
  salePriceHistory,
  sales,
  payments,
  paymentAllocations,
  userRoles,
  roles,
  leads,
  leadSources,
  leadActivities,
  reservations,
  invoices,
  taxRates,
  notifications,
  pushSubscriptions,
  auditLogs,
  documentTypes,
  acquisitionStatusHistory,
  branchLocations,
  vehicleMakes,
  vehicleModels,
  vehicleModelYears,
  vehicleVariants,
  suppliers,
  inspections,
  inspectionTemplates,
  inspectionTemplateItems,
  inspectionItems,
  inspectionSections,
  inspectionFindings,
  inspectionPhotos,
  inspectionRecommendations,
  inspectionStatusHistory,
  vendors,
  systemSettings,
  vehiclePricing,
  vehiclePricingHistory,
  vehicleCatalogMappingUnmatched,
  permissions,
  rolePermissions,
} from "./schema";

export const branchesRelations = relations(branches, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [branches.managerUserId],
    references: [profiles.id],
    relationName: "branches_managerUserId_profiles_id",
  }),
  profiles: many(profiles, {
    relationName: "profiles_branchId_branches_id",
  }),
  customers: many(customers),
  payments: many(payments),
  userRoles: many(userRoles),
  leads: many(leads),
  reservations: many(reservations),
  sales: many(sales),
  invoices: many(invoices),
  documents: many(documents),
  vehicles: many(vehicles),
  branchLocations: many(branchLocations),
  acquisitions: many(acquisitions),
  inspections: many(inspections),
  vendors: many(vendors),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  branches: many(branches, {
    relationName: "branches_managerUserId_profiles_id",
  }),
  branch: one(branches, {
    fields: [profiles.branchId],
    references: [branches.id],
    relationName: "profiles_branchId_branches_id",
  }),
  profile: one(profiles, {
    fields: [profiles.deletedBy],
    references: [profiles.id],
    relationName: "profiles_deletedBy_profiles_id",
  }),
  profiles: many(profiles, {
    relationName: "profiles_deletedBy_profiles_id",
  }),
  authUsers: one(authUsers, {
    fields: [profiles.id],
    references: [authUsers.id],
  }),
  vehicleExpenses: many(vehicleExpenses),
  vehiclePriceHistories: many(vehiclePriceHistory),
  vehicleStatusHistories: many(vehicleStatusHistory),
  vehiclePhotos: many(vehiclePhotos),
  customers_createdBy: many(customers, {
    relationName: "customers_createdBy_profiles_id",
  }),
  customers_deletedBy: many(customers, {
    relationName: "customers_deletedBy_profiles_id",
  }),
  salePriceHistories: many(salePriceHistory),
  payments: many(payments),
  userRoles_assignedBy: many(userRoles, {
    relationName: "userRoles_assignedBy_profiles_id",
  }),
  userRoles_userId: many(userRoles, {
    relationName: "userRoles_userId_profiles_id",
  }),
  leads_assignedTo: many(leads, {
    relationName: "leads_assignedTo_profiles_id",
  }),
  leads_createdBy: many(leads, {
    relationName: "leads_createdBy_profiles_id",
  }),
  leads_deletedBy: many(leads, {
    relationName: "leads_deletedBy_profiles_id",
  }),
  leadActivities: many(leadActivities),
  reservations_createdBy: many(reservations, {
    relationName: "reservations_createdBy_profiles_id",
  }),
  reservations_salespersonId: many(reservations, {
    relationName: "reservations_salespersonId_profiles_id",
  }),
  sales_createdBy: many(sales, {
    relationName: "sales_createdBy_profiles_id",
  }),
  sales_salespersonId: many(sales, {
    relationName: "sales_salespersonId_profiles_id",
  }),
  sales_updatedBy: many(sales, {
    relationName: "sales_updatedBy_profiles_id",
  }),
  invoices: many(invoices),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
  auditLogs: many(auditLogs),
  documents_deletedBy: many(documents, {
    relationName: "documents_deletedBy_profiles_id",
  }),
  documents_uploadedBy: many(documents, {
    relationName: "documents_uploadedBy_profiles_id",
  }),
  acquisitionStatusHistories: many(acquisitionStatusHistory),
  vehicles_createdBy: many(vehicles, {
    relationName: "vehicles_createdBy_profiles_id",
  }),
  vehicles_deletedBy: many(vehicles, {
    relationName: "vehicles_deletedBy_profiles_id",
  }),
  vehicles_updatedBy: many(vehicles, {
    relationName: "vehicles_updatedBy_profiles_id",
  }),
  acquisitions_approvedBy: many(acquisitions, {
    relationName: "acquisitions_approvedBy_profiles_id",
  }),
  acquisitions_createdBy: many(acquisitions, {
    relationName: "acquisitions_createdBy_profiles_id",
  }),
  acquisitions_rejectedBy: many(acquisitions, {
    relationName: "acquisitions_rejectedBy_profiles_id",
  }),
  acquisitions_updatedBy: many(acquisitions, {
    relationName: "acquisitions_updatedBy_profiles_id",
  }),
  inspections_assignedBy: many(inspections, {
    relationName: "inspections_assignedBy_profiles_id",
  }),
  inspections_assignedTo: many(inspections, {
    relationName: "inspections_assignedTo_profiles_id",
  }),
  inspections_createdBy: many(inspections, {
    relationName: "inspections_createdBy_profiles_id",
  }),
  inspections_inspectedBy: many(inspections, {
    relationName: "inspections_inspectedBy_profiles_id",
  }),
  inspections_inspectorId: many(inspections, {
    relationName: "inspections_inspectorId_profiles_id",
  }),
  inspections_reviewedBy: many(inspections, {
    relationName: "inspections_reviewedBy_profiles_id",
  }),
  inspections_updatedBy: many(inspections, {
    relationName: "inspections_updatedBy_profiles_id",
  }),
  inspectionPhotos: many(inspectionPhotos),
  inspectionFindings_createdBy: many(inspectionFindings, {
    relationName: "inspectionFindings_createdBy_profiles_id",
  }),
  inspectionFindings_updatedBy: many(inspectionFindings, {
    relationName: "inspectionFindings_updatedBy_profiles_id",
  }),
  inspectionRecommendations: many(inspectionRecommendations),
  inspectionStatusHistories: many(inspectionStatusHistory),
  vendors: many(vendors),
  systemSettings: many(systemSettings),
  vehiclePricings_approvedBy: many(vehiclePricing, {
    relationName: "vehiclePricing_approvedBy_profiles_id",
  }),
  vehiclePricings_createdBy: many(vehiclePricing, {
    relationName: "vehiclePricing_createdBy_profiles_id",
  }),
  vehiclePricings_updatedBy: many(vehiclePricing, {
    relationName: "vehiclePricing_updatedBy_profiles_id",
  }),
  vehiclePricingHistories: many(vehiclePricingHistory),
}));

export const authUsersRelations = relations(authUsers, ({ many }) => ({
  profiles: many(profiles),
  emailVerificationOtps: many(emailVerificationOtps),
}));

export const vehicleExpensesRelations = relations(vehicleExpenses, ({ one }) => ({
  acquisition: one(acquisitions, {
    fields: [vehicleExpenses.acquisitionId],
    references: [acquisitions.id],
  }),
  profile: one(profiles, {
    fields: [vehicleExpenses.createdBy],
    references: [profiles.id],
  }),
  document: one(documents, {
    fields: [vehicleExpenses.documentId],
    references: [documents.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehicleExpenses.vehicleId],
    references: [vehicles.id],
  }),
}));

export const acquisitionsRelations = relations(acquisitions, ({ one, many }) => ({
  vehicleExpenses: many(vehicleExpenses),
  acquisitionStatusHistories: many(acquisitionStatusHistory),
  profile_approvedBy: one(profiles, {
    fields: [acquisitions.approvedBy],
    references: [profiles.id],
    relationName: "acquisitions_approvedBy_profiles_id",
  }),
  branch: one(branches, {
    fields: [acquisitions.branchId],
    references: [branches.id],
  }),
  profile_createdBy: one(profiles, {
    fields: [acquisitions.createdBy],
    references: [profiles.id],
    relationName: "acquisitions_createdBy_profiles_id",
  }),
  customer: one(customers, {
    fields: [acquisitions.customerId],
    references: [customers.id],
  }),
  profile_rejectedBy: one(profiles, {
    fields: [acquisitions.rejectedBy],
    references: [profiles.id],
    relationName: "acquisitions_rejectedBy_profiles_id",
  }),
  supplier: one(suppliers, {
    fields: [acquisitions.supplierId],
    references: [suppliers.id],
  }),
  profile_updatedBy: one(profiles, {
    fields: [acquisitions.updatedBy],
    references: [profiles.id],
    relationName: "acquisitions_updatedBy_profiles_id",
  }),
  vehicle: one(vehicles, {
    fields: [acquisitions.vehicleId],
    references: [vehicles.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  vehicleExpenses: many(vehicleExpenses),
  branch: one(branches, {
    fields: [documents.branchId],
    references: [branches.id],
  }),
  profile_deletedBy: one(profiles, {
    fields: [documents.deletedBy],
    references: [profiles.id],
    relationName: "documents_deletedBy_profiles_id",
  }),
  documentType: one(documentTypes, {
    fields: [documents.documentTypeId],
    references: [documentTypes.id],
  }),
  profile_uploadedBy: one(profiles, {
    fields: [documents.uploadedBy],
    references: [profiles.id],
    relationName: "documents_uploadedBy_profiles_id",
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  vehicleExpenses: many(vehicleExpenses),
  vehiclePriceHistories: many(vehiclePriceHistory),
  vehicleStatusHistories: many(vehicleStatusHistory),
  vehiclePhotos: many(vehiclePhotos),
  leads: many(leads),
  reservations: many(reservations),
  sales: many(sales),
  branch: one(branches, {
    fields: [vehicles.branchId],
    references: [branches.id],
  }),
  profile_createdBy: one(profiles, {
    fields: [vehicles.createdBy],
    references: [profiles.id],
    relationName: "vehicles_createdBy_profiles_id",
  }),
  profile_deletedBy: one(profiles, {
    fields: [vehicles.deletedBy],
    references: [profiles.id],
    relationName: "vehicles_deletedBy_profiles_id",
  }),
  branchLocation: one(branchLocations, {
    fields: [vehicles.locationId],
    references: [branchLocations.id],
  }),
  vehicleMake: one(vehicleMakes, {
    fields: [vehicles.makeId],
    references: [vehicleMakes.id],
  }),
  vehicleModel: one(vehicleModels, {
    fields: [vehicles.modelId],
    references: [vehicleModels.id],
  }),
  vehicleModelYear: one(vehicleModelYears, {
    fields: [vehicles.modelYearId],
    references: [vehicleModelYears.id],
  }),
  profile_updatedBy: one(profiles, {
    fields: [vehicles.updatedBy],
    references: [profiles.id],
    relationName: "vehicles_updatedBy_profiles_id",
  }),
  vehicleVariant: one(vehicleVariants, {
    fields: [vehicles.variantId],
    references: [vehicleVariants.id],
  }),
  acquisitions: many(acquisitions),
  inspections: many(inspections),
  vehiclePricings: many(vehiclePricing),
  vehiclePricingHistories: many(vehiclePricingHistory),
  vehicleCatalogMappingUnmatcheds: many(vehicleCatalogMappingUnmatched),
}));

export const vehiclePriceHistoryRelations = relations(vehiclePriceHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [vehiclePriceHistory.changedBy],
    references: [profiles.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehiclePriceHistory.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleStatusHistoryRelations = relations(vehicleStatusHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [vehicleStatusHistory.changedBy],
    references: [profiles.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehicleStatusHistory.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehiclePhotosRelations = relations(vehiclePhotos, ({ one }) => ({
  profile: one(profiles, {
    fields: [vehiclePhotos.uploadedBy],
    references: [profiles.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehiclePhotos.vehicleId],
    references: [vehicles.id],
  }),
}));

export const emailVerificationOtpsRelations = relations(emailVerificationOtps, ({ one }) => ({
  authUsers: one(authUsers, {
    fields: [emailVerificationOtps.userId],
    references: [authUsers.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  branch: one(branches, {
    fields: [customers.branchId],
    references: [branches.id],
  }),
  profile_createdBy: one(profiles, {
    fields: [customers.createdBy],
    references: [profiles.id],
    relationName: "customers_createdBy_profiles_id",
  }),
  profile_deletedBy: one(profiles, {
    fields: [customers.deletedBy],
    references: [profiles.id],
    relationName: "customers_deletedBy_profiles_id",
  }),
  payments: many(payments),
  leads: many(leads),
  reservations: many(reservations),
  sales: many(sales),
  invoices: many(invoices),
  acquisitions: many(acquisitions),
}));

export const salePriceHistoryRelations = relations(salePriceHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [salePriceHistory.changedBy],
    references: [profiles.id],
  }),
  sale: one(sales, {
    fields: [salePriceHistory.saleId],
    references: [sales.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  salePriceHistories: many(salePriceHistory),
  payments: many(payments),
  paymentAllocations: many(paymentAllocations),
  branch: one(branches, {
    fields: [sales.branchId],
    references: [branches.id],
  }),
  profile_createdBy: one(profiles, {
    fields: [sales.createdBy],
    references: [profiles.id],
    relationName: "sales_createdBy_profiles_id",
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  reservation: one(reservations, {
    fields: [sales.reservationId],
    references: [reservations.id],
  }),
  profile_salespersonId: one(profiles, {
    fields: [sales.salespersonId],
    references: [profiles.id],
    relationName: "sales_salespersonId_profiles_id",
  }),
  profile_updatedBy: one(profiles, {
    fields: [sales.updatedBy],
    references: [profiles.id],
    relationName: "sales_updatedBy_profiles_id",
  }),
  vehicle: one(vehicles, {
    fields: [sales.vehicleId],
    references: [vehicles.id],
  }),
  invoices: many(invoices),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  branch: one(branches, {
    fields: [payments.branchId],
    references: [branches.id],
  }),
  profile: one(profiles, {
    fields: [payments.createdBy],
    references: [profiles.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  sale: one(sales, {
    fields: [payments.saleId],
    references: [sales.id],
  }),
  paymentAllocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAllocations.paymentId],
    references: [payments.id],
  }),
  sale: one(sales, {
    fields: [paymentAllocations.saleId],
    references: [sales.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  profile_assignedBy: one(profiles, {
    fields: [userRoles.assignedBy],
    references: [profiles.id],
    relationName: "userRoles_assignedBy_profiles_id",
  }),
  branch: one(branches, {
    fields: [userRoles.branchId],
    references: [branches.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  profile_userId: one(profiles, {
    fields: [userRoles.userId],
    references: [profiles.id],
    relationName: "userRoles_userId_profiles_id",
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  profile_assignedTo: one(profiles, {
    fields: [leads.assignedTo],
    references: [profiles.id],
    relationName: "leads_assignedTo_profiles_id",
  }),
  branch: one(branches, {
    fields: [leads.branchId],
    references: [branches.id],
  }),
  profile_createdBy: one(profiles, {
    fields: [leads.createdBy],
    references: [profiles.id],
    relationName: "leads_createdBy_profiles_id",
  }),
  customer: one(customers, {
    fields: [leads.customerId],
    references: [customers.id],
  }),
  profile_deletedBy: one(profiles, {
    fields: [leads.deletedBy],
    references: [profiles.id],
    relationName: "leads_deletedBy_profiles_id",
  }),
  leadSource: one(leadSources, {
    fields: [leads.sourceId],
    references: [leadSources.id],
  }),
  vehicle: one(vehicles, {
    fields: [leads.vehicleId],
    references: [vehicles.id],
  }),
  leadActivities: many(leadActivities),
  reservations: many(reservations),
}));

export const leadSourcesRelations = relations(leadSources, ({ many }) => ({
  leads: many(leads),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  profile: one(profiles, {
    fields: [leadActivities.createdBy],
    references: [profiles.id],
  }),
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  branch: one(branches, {
    fields: [reservations.branchId],
    references: [branches.id],
  }),
  profile_createdBy: one(profiles, {
    fields: [reservations.createdBy],
    references: [profiles.id],
    relationName: "reservations_createdBy_profiles_id",
  }),
  customer: one(customers, {
    fields: [reservations.customerId],
    references: [customers.id],
  }),
  lead: one(leads, {
    fields: [reservations.leadId],
    references: [leads.id],
  }),
  profile_salespersonId: one(profiles, {
    fields: [reservations.salespersonId],
    references: [profiles.id],
    relationName: "reservations_salespersonId_profiles_id",
  }),
  vehicle: one(vehicles, {
    fields: [reservations.vehicleId],
    references: [vehicles.id],
  }),
  sales: many(sales),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  branch: one(branches, {
    fields: [invoices.branchId],
    references: [branches.id],
  }),
  profile: one(profiles, {
    fields: [invoices.createdBy],
    references: [profiles.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  sale: one(sales, {
    fields: [invoices.saleId],
    references: [sales.id],
  }),
  taxRate: one(taxRates, {
    fields: [invoices.taxRateId],
    references: [taxRates.id],
  }),
}));

export const taxRatesRelations = relations(taxRates, ({ many }) => ({
  invoices: many(invoices),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  profile: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  profile: one(profiles, {
    fields: [pushSubscriptions.userId],
    references: [profiles.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  profile: one(profiles, {
    fields: [auditLogs.userId],
    references: [profiles.id],
  }),
}));

export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
  documents: many(documents),
}));

export const acquisitionStatusHistoryRelations = relations(acquisitionStatusHistory, ({ one }) => ({
  acquisition: one(acquisitions, {
    fields: [acquisitionStatusHistory.acquisitionId],
    references: [acquisitions.id],
  }),
  profile: one(profiles, {
    fields: [acquisitionStatusHistory.changedBy],
    references: [profiles.id],
  }),
}));

export const branchLocationsRelations = relations(branchLocations, ({ one, many }) => ({
  vehicles: many(vehicles),
  branch: one(branches, {
    fields: [branchLocations.branchId],
    references: [branches.id],
  }),
}));

export const vehicleMakesRelations = relations(vehicleMakes, ({ many }) => ({
  vehicles: many(vehicles),
  vehicleModels: many(vehicleModels),
}));

export const vehicleModelsRelations = relations(vehicleModels, ({ one, many }) => ({
  vehicles: many(vehicles),
  vehicleMake: one(vehicleMakes, {
    fields: [vehicleModels.makeId],
    references: [vehicleMakes.id],
  }),
  vehicleModelYears: many(vehicleModelYears),
}));

export const vehicleModelYearsRelations = relations(vehicleModelYears, ({ one, many }) => ({
  vehicles: many(vehicles),
  vehicleModel: one(vehicleModels, {
    fields: [vehicleModelYears.modelId],
    references: [vehicleModels.id],
  }),
  vehicleVariants: many(vehicleVariants),
}));

export const vehicleVariantsRelations = relations(vehicleVariants, ({ one, many }) => ({
  vehicles: many(vehicles),
  vehicleModelYear: one(vehicleModelYears, {
    fields: [vehicleVariants.modelYearId],
    references: [vehicleModelYears.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  acquisitions: many(acquisitions),
}));

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  profile_assignedBy: one(profiles, {
    fields: [inspections.assignedBy],
    references: [profiles.id],
    relationName: "inspections_assignedBy_profiles_id",
  }),
  profile_assignedTo: one(profiles, {
    fields: [inspections.assignedTo],
    references: [profiles.id],
    relationName: "inspections_assignedTo_profiles_id",
  }),
  branch: one(branches, {
    fields: [inspections.branchId],
    references: [branches.id],
  }),
  profile_createdBy: one(profiles, {
    fields: [inspections.createdBy],
    references: [profiles.id],
    relationName: "inspections_createdBy_profiles_id",
  }),
  profile_inspectedBy: one(profiles, {
    fields: [inspections.inspectedBy],
    references: [profiles.id],
    relationName: "inspections_inspectedBy_profiles_id",
  }),
  profile_inspectorId: one(profiles, {
    fields: [inspections.inspectorId],
    references: [profiles.id],
    relationName: "inspections_inspectorId_profiles_id",
  }),
  inspection: one(inspections, {
    fields: [inspections.parentInspectionId],
    references: [inspections.id],
    relationName: "inspections_parentInspectionId_inspections_id",
  }),
  inspections: many(inspections, {
    relationName: "inspections_parentInspectionId_inspections_id",
  }),
  profile_reviewedBy: one(profiles, {
    fields: [inspections.reviewedBy],
    references: [profiles.id],
    relationName: "inspections_reviewedBy_profiles_id",
  }),
  inspectionTemplate: one(inspectionTemplates, {
    fields: [inspections.templateId],
    references: [inspectionTemplates.id],
  }),
  profile_updatedBy: one(profiles, {
    fields: [inspections.updatedBy],
    references: [profiles.id],
    relationName: "inspections_updatedBy_profiles_id",
  }),
  vehicle: one(vehicles, {
    fields: [inspections.vehicleId],
    references: [vehicles.id],
  }),
  inspectionItems: many(inspectionItems),
  inspectionPhotos: many(inspectionPhotos),
  inspectionFindings: many(inspectionFindings),
  inspectionRecommendations: many(inspectionRecommendations),
  inspectionSections: many(inspectionSections),
  inspectionStatusHistories: many(inspectionStatusHistory),
}));

export const inspectionTemplatesRelations = relations(inspectionTemplates, ({ many }) => ({
  inspections: many(inspections),
  inspectionTemplateItems: many(inspectionTemplateItems),
}));

export const inspectionTemplateItemsRelations = relations(
  inspectionTemplateItems,
  ({ one, many }) => ({
    inspectionTemplate: one(inspectionTemplates, {
      fields: [inspectionTemplateItems.templateId],
      references: [inspectionTemplates.id],
    }),
    inspectionItems: many(inspectionItems),
  }),
);

export const inspectionItemsRelations = relations(inspectionItems, ({ one, many }) => ({
  inspection: one(inspections, {
    fields: [inspectionItems.inspectionId],
    references: [inspections.id],
  }),
  inspectionSection: one(inspectionSections, {
    fields: [inspectionItems.sectionId],
    references: [inspectionSections.id],
  }),
  inspectionTemplateItem: one(inspectionTemplateItems, {
    fields: [inspectionItems.templateItemId],
    references: [inspectionTemplateItems.id],
  }),
  inspectionPhotos: many(inspectionPhotos),
  inspectionFindings: many(inspectionFindings),
}));

export const inspectionSectionsRelations = relations(inspectionSections, ({ one, many }) => ({
  inspectionItems: many(inspectionItems),
  inspectionPhotos: many(inspectionPhotos),
  inspectionFindings: many(inspectionFindings),
  inspection: one(inspections, {
    fields: [inspectionSections.inspectionId],
    references: [inspections.id],
  }),
}));

export const inspectionPhotosRelations = relations(inspectionPhotos, ({ one }) => ({
  inspectionFinding: one(inspectionFindings, {
    fields: [inspectionPhotos.findingId],
    references: [inspectionFindings.id],
  }),
  inspection: one(inspections, {
    fields: [inspectionPhotos.inspectionId],
    references: [inspections.id],
  }),
  inspectionItem: one(inspectionItems, {
    fields: [inspectionPhotos.inspectionItemId],
    references: [inspectionItems.id],
  }),
  inspectionSection: one(inspectionSections, {
    fields: [inspectionPhotos.sectionId],
    references: [inspectionSections.id],
  }),
  profile: one(profiles, {
    fields: [inspectionPhotos.uploadedBy],
    references: [profiles.id],
  }),
}));

export const inspectionFindingsRelations = relations(inspectionFindings, ({ one, many }) => ({
  inspectionPhotos: many(inspectionPhotos),
  profile_createdBy: one(profiles, {
    fields: [inspectionFindings.createdBy],
    references: [profiles.id],
    relationName: "inspectionFindings_createdBy_profiles_id",
  }),
  inspection: one(inspections, {
    fields: [inspectionFindings.inspectionId],
    references: [inspections.id],
  }),
  inspectionItem: one(inspectionItems, {
    fields: [inspectionFindings.inspectionItemId],
    references: [inspectionItems.id],
  }),
  inspectionSection: one(inspectionSections, {
    fields: [inspectionFindings.sectionId],
    references: [inspectionSections.id],
  }),
  profile_updatedBy: one(profiles, {
    fields: [inspectionFindings.updatedBy],
    references: [profiles.id],
    relationName: "inspectionFindings_updatedBy_profiles_id",
  }),
  inspectionRecommendations: many(inspectionRecommendations),
}));

export const inspectionRecommendationsRelations = relations(
  inspectionRecommendations,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [inspectionRecommendations.createdBy],
      references: [profiles.id],
    }),
    inspectionFinding: one(inspectionFindings, {
      fields: [inspectionRecommendations.findingId],
      references: [inspectionFindings.id],
    }),
    inspection: one(inspections, {
      fields: [inspectionRecommendations.inspectionId],
      references: [inspections.id],
    }),
  }),
);

export const inspectionStatusHistoryRelations = relations(inspectionStatusHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [inspectionStatusHistory.changedBy],
    references: [profiles.id],
  }),
  inspection: one(inspections, {
    fields: [inspectionStatusHistory.inspectionId],
    references: [inspections.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ one }) => ({
  branch: one(branches, {
    fields: [vendors.branchId],
    references: [branches.id],
  }),
  profile: one(profiles, {
    fields: [vendors.createdBy],
    references: [profiles.id],
  }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  profile: one(profiles, {
    fields: [systemSettings.updatedBy],
    references: [profiles.id],
  }),
}));

export const vehiclePricingRelations = relations(vehiclePricing, ({ one, many }) => ({
  profile_approvedBy: one(profiles, {
    fields: [vehiclePricing.approvedBy],
    references: [profiles.id],
    relationName: "vehiclePricing_approvedBy_profiles_id",
  }),
  profile_createdBy: one(profiles, {
    fields: [vehiclePricing.createdBy],
    references: [profiles.id],
    relationName: "vehiclePricing_createdBy_profiles_id",
  }),
  profile_updatedBy: one(profiles, {
    fields: [vehiclePricing.updatedBy],
    references: [profiles.id],
    relationName: "vehiclePricing_updatedBy_profiles_id",
  }),
  vehicle: one(vehicles, {
    fields: [vehiclePricing.vehicleId],
    references: [vehicles.id],
  }),
  vehiclePricingHistories: many(vehiclePricingHistory),
}));

export const vehiclePricingHistoryRelations = relations(vehiclePricingHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [vehiclePricingHistory.changedBy],
    references: [profiles.id],
  }),
  vehiclePricing: one(vehiclePricing, {
    fields: [vehiclePricingHistory.pricingId],
    references: [vehiclePricing.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehiclePricingHistory.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleCatalogMappingUnmatchedRelations = relations(
  vehicleCatalogMappingUnmatched,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [vehicleCatalogMappingUnmatched.vehicleId],
      references: [vehicles.id],
    }),
  }),
);

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));
