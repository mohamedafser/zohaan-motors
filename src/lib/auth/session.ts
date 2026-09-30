import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AuthUser } from "@/types/auth";

export async function getSessionUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  return {
    id: data.claims.sub,
    email: data.claims.email ?? null,
  };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function mfaStatus() {
  if (!isSupabaseConfigured()) return "unavailable" as const;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return "unavailable" as const;
  if (data.currentLevel === "aal2") return "verified" as const;
  if (data.nextLevel === "aal2") return "required" as const;
  return "optional" as const;
}
