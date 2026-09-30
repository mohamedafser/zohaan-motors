"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField, useTranslatedMessage } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { confirmEnrollment, enrollMfa, mfaAction } from "@/lib/auth/actions";
import { mfaCodeSchema, type MfaCodeValues } from "@/lib/validation";
import { initialAuthState } from "@/types/auth";

export function MfaPanel({ mode }: { mode: "challenge" | "enroll" }) {
  const t = useTranslations();
  const translate = useTranslatedMessage();
  const [state, submit, pending] = useActionState(mfaAction, initialAuthState);
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [enrollError, setEnrollError] = useState<string>();
  const [enrolling, setEnrolling] = useState(false);
  const [confirmError, setConfirmError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const challengeForm = useForm<MfaCodeValues>({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { code: "" },
  });
  const enrollForm = useForm<MfaCodeValues>({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { code: "" },
  });

  async function startEnrollment() {
    setEnrolling(true);
    setEnrollError(undefined);
    const result = await enrollMfa();
    if ("factorId" in result) {
      setEnrollment({
        factorId: result.factorId,
        qrCode: result.qrCode,
        secret: result.secret,
      });
    } else {
      setEnrollError(result.formError);
    }
    setEnrolling(false);
  }

  async function confirm(values: MfaCodeValues) {
    if (!enrollment) return;
    setConfirming(true);
    setConfirmError(undefined);
    const result = await confirmEnrollment(enrollment.factorId, values);
    if (result?.formError || result?.fieldErrors) {
      setConfirmError(result.formError ?? result.fieldErrors?.code);
    }
    setConfirming(false);
  }

  if (mode === "challenge") {
    return (
      <form
        className="grid gap-4"
        onSubmit={challengeForm.handleSubmit((values) => submit(values))}
        noValidate
      >
        <p className="text-muted-foreground text-sm">{t("auth.mfa.description")}</p>
        {state.formError ? (
          <Alert variant="destructive">
            <AlertDescription>{translate(state.formError)}</AlertDescription>
          </Alert>
        ) : null}
        <FormField
          label={t("auth.mfa.code")}
          htmlFor="code"
          error={challengeForm.formState.errors.code?.message ?? state.fieldErrors?.code}
        >
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-11 md:h-10"
            aria-invalid={Boolean(challengeForm.formState.errors.code) || undefined}
            {...challengeForm.register("code")}
          />
        </FormField>
        <LoadingButton type="submit" className="h-11" loading={pending}>
          {t("auth.mfa.submit")}
        </LoadingButton>
      </form>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-base font-medium">{t("auth.mfa.enrollTitle")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("auth.mfa.enrollDescription")}</p>
      </div>
      {enrollError ? (
        <Alert variant="destructive">
          <AlertDescription>{translate(enrollError)}</AlertDescription>
        </Alert>
      ) : null}
      {!enrollment ? (
        <LoadingButton type="button" className="h-11" loading={enrolling} onClick={startEnrollment}>
          {t("auth.mfa.enrollAction")}
        </LoadingButton>
      ) : (
        <form className="grid gap-4" onSubmit={enrollForm.handleSubmit(confirm)} noValidate>
          {/* Authenticator setup codes are SVG data URIs from Supabase, not app assets. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt=""
            className="mx-auto size-44 rounded-lg bg-white p-2"
          />
          <p className="text-muted-foreground text-xs break-all">
            <span className="text-foreground font-medium">{t("auth.mfa.secret")}: </span>
            {enrollment.secret}
          </p>
          {confirmError ? (
            <Alert variant="destructive">
              <AlertDescription>{translate(confirmError)}</AlertDescription>
            </Alert>
          ) : null}
          <FormField
            label={t("auth.mfa.code")}
            htmlFor="enroll-code"
            error={enrollForm.formState.errors.code?.message}
          >
            <Input
              id="enroll-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-11 md:h-10"
              {...enrollForm.register("code")}
            />
          </FormField>
          <LoadingButton type="submit" className="h-11" loading={confirming}>
            {t("auth.mfa.confirm")}
          </LoadingButton>
        </form>
      )}
    </div>
  );
}
