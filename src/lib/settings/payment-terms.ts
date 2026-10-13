import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PAYMENT_TERMS,
  MAX_TERM_MINUTES,
  PAYMENT_TERM_KEYS,
  type PaymentTerms,
  type PaymentTermsValues,
} from "@/lib/validation/payment-terms";

const toMinutes = (value: unknown, fallback: number) => {
  const n = typeof value === "number" ? value : Number.NaN;
  return Number.isInteger(n) && n >= 1 && n <= MAX_TERM_MINUTES ? n : fallback;
};

/** Booking payment deadlines from Settings (same fallbacks as public.booking_term_minutes()). */
export async function getPaymentTerms(): Promise<PaymentTerms> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", [PAYMENT_TERM_KEYS.depositMinutes, PAYMENT_TERM_KEYS.balanceMinutes]);
  const values = new Map(((data ?? []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value]));
  return {
    depositMinutes: toMinutes(values.get(PAYMENT_TERM_KEYS.depositMinutes), DEFAULT_PAYMENT_TERMS.depositMinutes),
    balanceMinutes: toMinutes(values.get(PAYMENT_TERM_KEYS.balanceMinutes), DEFAULT_PAYMENT_TERMS.balanceMinutes),
  };
}

/** RLS limits writes to settings.manage. */
export async function updatePaymentTerms(values: PaymentTermsValues, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("system_settings").upsert(
    [
      { key: PAYMENT_TERM_KEYS.depositMinutes, value: values.depositMinutes, updated_by: userId },
      { key: PAYMENT_TERM_KEYS.balanceMinutes, value: values.balanceMinutes, updated_by: userId },
    ],
    { onConflict: "key" },
  );
  return error?.message ?? null;
}
