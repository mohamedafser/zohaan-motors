export {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  changeVehicleStatus,
  transferVehicle,
  archiveVehicle,
  getVehicleStatusHistory,
  getVehicleActivity,
  getInventorySummary,
  listBranches,
  listLocations,
  listMakes,
  listModels,
  findDuplicateVehicle,
} from "@/lib/repositories/vehicles";

export {
  listAcquisitions,
  getAcquisition,
  createAcquisition,
  updateAcquisition,
  changeAcquisitionStatus,
  approveAcquisition,
  rejectAcquisition,
  cancelAcquisition,
  receiveAcquisition,
  addAcquisitionExpense,
  updateAcquisitionExpense,
  removeAcquisitionExpense,
  getAcquisitionHistory,
  getAcquisitionActivity,
  getAcquisitionSummary,
  getAcquisitionMeta,
  getAcquisitionForVehicle,
} from "@/lib/repositories/acquisitions";

export {
  getInspectionSummary,
  listInspections,
  getInspection,
  createInspection,
  updateInspection,
  saveInspectionDraft,
  assignInspection,
  startInspection,
  submitInspection,
  approveInspection,
  updateApprovedInspectionOutcome,
  rejectInspection,
  cancelInspection,
  requestReinspection,
  changeInspectionStatus,
  addFinding,
  updateFinding,
  deleteFinding,
  addInspectionPhoto,
  deleteInspectionPhoto,
  getInspectionHistory,
  getInspectionActivity,
  getInspectionMeta,
  listInspectionsForVehicle,
} from "@/lib/repositories/inspections";

export type { VehicleServiceError, ServiceResult } from "@/lib/repositories/vehicles";
export type { AcquisitionServiceError } from "@/lib/repositories/acquisitions";
export type { InspectionServiceError } from "@/lib/repositories/inspections";
export type { RepositoryResult } from "@/lib/repositories/types";
