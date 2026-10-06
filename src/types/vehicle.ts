export const VEHICLE_STATUSES = [
  "acquired",
  "under_inspection",
  "inspection_failed",
  "under_repair",
  "ready_for_sale",
  "reserved",
  "sold",
  "delivered",
  "returned",
  "archived",
] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

/** New vs used — separate from cosmetic `condition` (excellent/good/…). */
export const VEHICLE_MARKET_TYPES = ["new", "used"] as const;
export type VehicleMarketType = (typeof VEHICLE_MARKET_TYPES)[number];

/** Inspection summary filters on inventory list (not vehicle status). */
export const VEHICLE_INSPECTION_FILTERS = [
  "not_inspected",
  "in_progress",
  "pass",
  "pass_with_issues",
  "fail",
  "approved",
] as const;
export type VehicleInspectionFilter = (typeof VEHICLE_INSPECTION_FILTERS)[number];

export type VehicleListInspectionInfo = {
  id: string | null;
  status: string | null;
  result: string | null;
  label: VehicleInspectionFilter;
};

export const TRANSMISSION_TYPES = ["automatic", "manual", "cvt", "other"] as const;
export type TransmissionType = (typeof TRANSMISSION_TYPES)[number];

export const FUEL_TYPES = ["petrol", "diesel", "hybrid", "electric", "other"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const DRIVE_TYPES = ["fwd", "rwd", "awd", "four_wd", "other"] as const;
export type DriveType = (typeof DRIVE_TYPES)[number];

export const MILEAGE_UNITS = ["km", "mi"] as const;
export type MileageUnit = (typeof MILEAGE_UNITS)[number];

export const ORIGIN_TYPES = ["gcc", "imported", "unknown"] as const;
export type OriginType = (typeof ORIGIN_TYPES)[number];

export const BODY_TYPES = [
  "Sedan",
  "SUV",
  "Crossover",
  "Hatchback",
  "Coupe",
  "Convertible",
  "Pickup",
  "Van",
  "Wagon",
  "Sports Car",
  "Other",
] as const;

export const VEHICLE_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "stock_number",
  "year",
  "mileage",
  "status",
  "purchase_date",
  "make",
  "model",
] as const;

export type VehicleSortField = (typeof VEHICLE_SORT_FIELDS)[number];

export type VehicleListItem = {
  id: string;
  stockNumber: string;
  vin: string | null;
  chassisNumber: string | null;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  mileage: number;
  mileageUnit: MileageUnit;
  marketType: VehicleMarketType;
  status: VehicleStatus;
  branchId: string;
  branchName: string | null;
  locationId: string | null;
  locationName: string | null;
  bodyType: string | null;
  transmission: TransmissionType | null;
  fuelType: FuelType | null;
  originType: OriginType | null;
  exteriorColor: string | null;
  purchaseDate: string | null;
  currentSellingPrice: number | null;
  primaryPhotoUrl?: string | null;
  inspection?: VehicleListInspectionInfo | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleDetail = VehicleListItem & {
  engineSize: string | null;
  engineCylinders: number | null;
  seats: number | null;
  doors: number | null;
  driveType: DriveType | null;
  interiorColor: string | null;
  countryOfOrigin: string | null;
  registrationDate: string | null;
  registrationExpiry: string | null;
  description: string | null;
  source: string;
  condition: string | null;
  makeId: string | null;
  modelId: string | null;
  modelYearId: string | null;
  variantId: string | null;
  customVariant: string | null;
  archivedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdByName: string | null;
  updatedByName: string | null;
  /** Only present when caller has vehicle.cost.view / price.view */
  totalAcquisitionCost?: number;
  minimumSellingPrice?: number | null;
  /** Linked acquisition when user has acquisition.view */
  acquisition?: {
    id: string;
    acquisitionNumber: string;
    status: string;
    sourceType?: string | null;
    purchaseDate?: string | null;
    purchasePrice?: number | null;
    currency?: string | null;
    totalAcquisitionCost?: number;
  } | null;
};

export type VehicleStatusHistoryItem = {
  id: string;
  vehicleId: string;
  oldStatus: VehicleStatus | null;
  newStatus: VehicleStatus;
  reason: string | null;
  changedBy: string | null;
  changedByName: string | null;
  createdAt: string;
};

export type VehicleActivityItem = {
  id: string;
  action: string;
  entityType: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userId: string | null;
  userName: string | null;
};

export type InventorySummary = {
  total: number;
  readyForSale: number;
  underInspection: number;
  underRepair: number;
  reserved: number;
  sold: number;
};

export type BranchOption = {
  id: string;
  name: string;
  code: string;
};

export type LocationOption = {
  id: string;
  branchId: string;
  name: string;
  locationType: string;
};

export type MakeOption = {
  id: string;
  name: string;
  nameAr?: string | null;
  slug?: string;
};

export type ModelOption = {
  id: string;
  makeId: string;
  name: string;
  nameAr?: string | null;
  slug?: string;
};

/** Sentinel value for inventory “Other / custom variant” option. */
export const CUSTOM_VARIANT_VALUE = "__custom__" as const;

export type CatalogMake = {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

export type CatalogModel = {
  id: string;
  makeId: string;
  name: string;
  nameAr: string | null;
  slug: string;
  vehicleType: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type CatalogModelYear = {
  id: string;
  modelId: string;
  year: number;
  market: string;
  isActive: boolean;
};

export type CatalogVariant = {
  id: string;
  modelYearId: string;
  name: string;
  nameAr: string | null;
  slug: string;
  engine: string | null;
  engineCapacity: number | null;
  fuelType: FuelType | null;
  transmission: TransmissionType | null;
  drivetrain: DriveType | null;
  bodyType: string | null;
  seatingCapacity: number | null;
  isActive: boolean;
  sortOrder: number;
};

export type VehicleListResult = {
  items: VehicleListItem[];
  page: number;
  pageSize: number;
  total: number;
  summary: InventorySummary;
};
