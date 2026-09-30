import { createClient } from "@supabase/supabase-js";

import { requireSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export function hasServiceRoleKey() {
  return getServiceRoleKey().length > 0;
}

/**
 * Server-only admin client. Uses the service role key and must never be imported
 * into client components or exposed to the browser.
 */
export function createServiceRoleClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const { url } = requireSupabaseEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getBootstrapSecret() {
  return process.env.BOOTSTRAP_SECRET?.trim() || "";
}

export function isBootstrapEnabled() {
  return getBootstrapSecret().length >= 16;
}

export function secretsMatch(provided: string, expected: string) {
  if (!provided || !expected || provided.length !== expected.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
