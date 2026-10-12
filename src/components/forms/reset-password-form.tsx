"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField, useTranslatedMessage } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { signOutClient, useAuthSubmit } from "@/hooks/use-auth-submit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation";

export function ResetPasswordForm() {
  const t = useTranslations();
  const translate = useTranslatedMessage();
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(!configured);
  const { state, pending, submit } = useAuthSubmit("/api/auth/reset-password");
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!configured) return;

    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
      setChecked(true);
    });
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) setReady(true);
      setChecked(true);
    });

    return () => data.subscription.unsubscribe();
  }, [configured]);

  useEffect(() => {
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      form.setError(key as keyof ResetPasswordValues, { message });
    }
  }, [state, form]);

  if (!checked) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  if (!configured) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("auth.errors.notConfigured")}</AlertDescription>
      </Alert>
    );
  }

  if (state.status === "success") {
    return (
      <div className="grid gap-4">
        <Alert>
          <AlertDescription>{t("auth.reset.success")}</AlertDescription>
        </Alert>
        <LoadingButton type="button" className="h-11" onClick={() => void signOutClient()}>
          {t("auth.reset.continue")}
        </LoadingButton>
      </div>
    );
  }

  if (!ready) {
    return (
      <Alert>
        <AlertDescription>{t("auth.reset.waiting")}</AlertDescription>
      </Alert>
    );
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
        label={t("auth.reset.password")}
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
        label={t("auth.reset.confirm")}
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
      <LoadingButton type="submit" variant="brand" className="sheen h-11 font-semibold" loading={pending}>
        {t("auth.reset.submit")}
      </LoadingButton>
    </form>
  );
}
