"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField, useTranslatedMessage } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useAuthSubmit } from "@/hooks/use-auth-submit";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation";

export function AcceptInvitationForm() {
  const t = useTranslations();
  const translate = useTranslatedMessage();
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const { state, pending, submit } = useAuthSubmit("/api/auth/accept-invitation");
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function ensureSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
        return;
      }
      setSessionError(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "USER_UPDATED") {
        setReady(true);
        setSessionError(false);
      }
    });

    void ensureSession();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      form.setError(key as keyof ResetPasswordValues, { message });
    }
  }, [state, form]);

  if (sessionError && !ready) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{translate("auth.invite.waiting")}</AlertDescription>
      </Alert>
    );
  }

  if (!ready) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        void submit(values);
      })}
      noValidate
    >
      {state.formError ? (
        <Alert variant="destructive">
          <AlertDescription>{translate(state.formError)}</AlertDescription>
        </Alert>
      ) : null}
      <FormField
        label={t("auth.invite.password")}
        htmlFor="password"
        error={form.formState.errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          className="h-11 md:h-10"
          {...form.register("password")}
        />
      </FormField>
      <FormField
        label={t("auth.invite.confirm")}
        htmlFor="confirmPassword"
        error={form.formState.errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11 md:h-10"
          {...form.register("confirmPassword")}
        />
      </FormField>
      <LoadingButton type="submit" className="h-11" loading={pending}>
        {t("auth.invite.submit")}
      </LoadingButton>
    </form>
  );
}
