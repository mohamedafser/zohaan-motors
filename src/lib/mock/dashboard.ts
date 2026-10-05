import type { LeadStatus, SaleStatus, VehicleStatus } from "@/types/common";

export type SampleVehicle = {
  id: string;
  stockNumber: string;
  title: string;
  priceAed: number;
  status: VehicleStatus;
  branch: string;
  sample: true;
};

export type SampleLead = {
  id: string;
  name: string;
  source: string;
  status: LeadStatus;
  createdAt: string;
  sample: true;
};

export type SampleSale = {
  id: string;
  reference: string;
  customer: string;
  amountAed: number;
  status: SaleStatus;
  createdAt: string;
  sample: true;
};

/**
 * Layout-only sample figures. Do not treat these as showroom records.
 * Replace this module with repository calls in the database phase.
 */
export const dashboardSample = {
  sample: true as const,
  kpis: {
    stock: 48,
    available: 31,
    reserved: 9,
    monthSalesAed: 890_000,
  },
  salesSeries: [420_000, 510_000, 380_000, 640_000, 720_000, 890_000],
  inventoryMix: [
    { key: "available" as const, value: 31 },
    { key: "reserved" as const, value: 9 },
    { key: "sold" as const, value: 8 },
  ],
  aging: [
    { key: "fresh" as const, count: 18 },
    { key: "mid" as const, count: 14 },
    { key: "aging" as const, count: 9 },
    { key: "old" as const, count: 7 },
  ],
  vehicles: [
    {
      id: "v1",
      stockNumber: "SAMPLE-1042",
      title: "Sample sedan",
      priceAed: 89_000,
      status: "available",
      branch: "Sample branch",
      sample: true,
    },
    {
      id: "v2",
      stockNumber: "SAMPLE-1048",
      title: "Sample SUV",
      priceAed: 126_500,
      status: "reserved",
      branch: "Sample branch",
      sample: true,
    },
    {
      id: "v3",
      stockNumber: "SAMPLE-1101",
      title: "Sample crossover",
      priceAed: 74_000,
      status: "sold",
      branch: "Sample yard",
      sample: true,
    },
    {
      id: "v4",
      stockNumber: "SAMPLE-1114",
      title: "Sample hatchback",
      priceAed: 42_000,
      status: "available",
      branch: "Sample branch",
      sample: true,
    },
  ] satisfies SampleVehicle[],
  leads: [
    {
      id: "l1",
      name: "Sample lead",
      source: "Showroom",
      status: "new",
      createdAt: "2026-09-30T06:00:00.000Z",
      sample: true,
    },
    {
      id: "l2",
      name: "Sample enquiry",
      source: "Phone",
      status: "contacted",
      createdAt: "2026-09-29T08:30:00.000Z",
      sample: true,
    },
    {
      id: "l3",
      name: "Sample referral",
      source: "Referral",
      status: "qualified",
      createdAt: "2026-09-25T09:00:00.000Z",
      sample: true,
    },
  ] satisfies SampleLead[],
  sales: [
    {
      id: "s1",
      reference: "SAMPLE-S-18",
      customer: "Sample customer",
      amountAed: 89_000,
      status: "confirmed",
      createdAt: "2026-09-29T12:00:00.000Z",
      sample: true,
    },
    {
      id: "s2",
      reference: "SAMPLE-S-19",
      customer: "Sample buyer",
      amountAed: 126_500,
      status: "draft",
      createdAt: "2026-09-30T05:00:00.000Z",
      sample: true,
    },
  ] satisfies SampleSale[],
  actions: [
    { id: "a1", labelKey: "dashboard.actions.inspection", href: "/inspections" },
    { id: "a2", labelKey: "dashboard.actions.pricing", href: "/inventory" },
  ],
};
