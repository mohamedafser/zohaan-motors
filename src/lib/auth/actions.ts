"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authErrorKeys, mapAuthError } from "@/lib/auth/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/types/auth";
import {
  firstFieldErrors,
  forgotPasswordSchema,
  loginSchema,
  mfaCodeSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type LoginValues,
  type MfaCodeValues,
  type ResetPasswordValues,
} from "@/lib/validation";

async function siteOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function loginAction(
  _state: AuthActionState,
  values: LoginValues,
): Promise<AuthActionState> {
  return signIn(values);
}

export async function forgotAction(
  _state: AuthActionState,
  values: ForgotPasswordValues,
): Promise<AuthActionState> {
  return requestPasswordReset(values);
}

export async function resetAction(
  _state: AuthActionState,
  values: ResetPasswordValues,
): Promise<AuthActionState> {
  return updatePassword(values);
}

export async function mfaAction(
  _state: AuthActionState,
  values: MfaCodeValues,
): Promise<AuthActionState> {
  return verifyMfa(values);
}

export async function signIn(input: LoginValues): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", formError: authErrorKeys.notConfigured };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { status: "error", formError: mapAuthError(error) };

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    redirect("/mfa");
  }

  redirect("/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function requestPasswordReset(
  input: ForgotPasswordValues,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", formError: authErrorKeys.notConfigured };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error && (error.code === "over_request_rate_limit" || error.message.toLowerCase().includes("rate"))) {
    return { status: "error", formError: authErrorKeys.rateLimit };
  }

  return { status: "success" };
}

export async function updatePassword(input: ResetPasswordValues): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", formError: authErrorKeys.notConfigured };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { status: "error", formError: authErrorKeys.session };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", formError: mapAuthError(error) };

  return { status: "success" };
}

export async function verifyMfa(input: MfaCodeValues): Promise<AuthActionState> {
  const parsed = mfaCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", formError: authErrorKeys.notConfigured };
  }

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (listError || !factor) {
    return { status: "error", formError: authErrorKeys.generic };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: parsed.data.code,
  });
  if (error) return { status: "error", formError: authErrorKeys.generic };

  redirect("/dashboard");
}

export async function enrollMfa(): Promise<
  | { status: "success"; factorId: string; qrCode: string; secret: string }
  | AuthActionState
> {
  if (!isSupabaseConfigured()) {
    return { status: "error", formError: authErrorKeys.notConfigured };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.auth.mfa.listFactors();
  const unverified = existing?.all.filter((factor) => factor.status !== "verified") ?? [];
  for (const factor of unverified) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Zohaan Motors",
  });

  if (error || !data || data.type !== "totp") {
    return { status: "error", formError: authErrorKeys.generic };
  }

  return {
    status: "success",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function confirmEnrollment(
  factorId: string,
  input: MfaCodeValues,
): Promise<AuthActionState> {
  const parsed = mfaCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", formError: authErrorKeys.notConfigured };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: parsed.data.code,
  });
  if (error) return { status: "error", formError: authErrorKeys.generic };

  redirect("/dashboard");
}
