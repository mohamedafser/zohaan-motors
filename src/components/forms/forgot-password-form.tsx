"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { FormField, useTranslatedMessage } from "@/components/forms/form-field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { forgotAction } from "@/lib/auth/actions";
import { Link } from "@/lib/i18n/navigation";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation";
import { initialAuthState } from "@/types/auth";

export function ForgotPasswordForm() {
  const t = useTranslations();
  const translate = useTranslatedMessage();
  const [state, submit, pending] = useActionState(forgotAction, initialAuthState);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      form.setError(key as keyof ForgotPasswordValues, { message });
    }
  }, [state, form]);

  if (state.status === "success") {
    return (
      <div className="grid gap-4">
        <Alert>
          <AlertDescription>{t("auth.forgot.success")}</AlertDescription>
        </Alert>
        <Link href="/login" className="text-sm underline-offset-4 hover:underline">
          {t("auth.forgot.back")}
        </Link>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => submit(values))} noValidate>
      {state.formError ? (
        <Alert variant="destructive">
          <AlertDescription>{translate(state.formError)}</AlertDescription>
        </Alert>
      ) : null}
      <FormField
        label={t("auth.login.email")}
        htmlFor="email"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11 md:h-10"
          aria-invalid={Boolean(form.formState.errors.email) || undefined}
          aria-describedby={form.formState.errors.email ? "email-error" : undefined}
          {...form.register("email")}
        />
      </FormField>
      <LoadingButton type="submit" className="h-11" loading={pending}>
        {t("auth.forgot.submit")}
      </LoadingButton>
      <Link href="/login" className="text-sm underline-offset-4 hover:underline">
        {t("auth.forgot.back")}
      </Link>
    </form>
  );
}
