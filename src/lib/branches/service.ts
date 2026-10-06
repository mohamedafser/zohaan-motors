import { createClient } from "@/lib/supabase/server";

export type BranchListItem = {
  id: string;
  name: string;
  code: string;
  emirate: string;
  city: string;
  addressLine1: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
};

type BranchRow = {
  id: string;
  name: string;
  code: string;
  emirate: string;
  city: string;
  address_line_1: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

// Uses the caller's session so RLS limits results to branches they can access.
export async function listBranchesForUser(): Promise<BranchListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("branches")
    .select("id, name, code, emirate, city, address_line_1, phone, email, is_active")
    .order("name");

  return ((data ?? []) as BranchRow[]).map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    emirate: b.emirate,
    city: b.city,
    addressLine1: b.address_line_1,
    phone: b.phone,
    email: b.email,
    isActive: b.is_active,
  }));
}
