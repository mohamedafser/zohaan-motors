import { notImplemented, type RepositoryResult } from "@/lib/repositories/types";

export type VehicleRecord = {
  id: string;
  stockNumber: string;
  title: string;
};

/**
 * Vehicle queries belong here, not in UI components.
 * The database phase will replace `notImplemented` with Supabase calls.
 */
export const vehiclesRepository = {
  async list(): Promise<RepositoryResult<VehicleRecord[]>> {
    return notImplemented();
  },
};
