import { jsonAuthResponse, invalidJsonResponse, readJsonBody } from "@/lib/auth/http";
import { getUserContext } from "@/lib/auth/session";
import {
  hasPendingVerification,
  resendVerificationCode,
  startInviteVerification,
  VerificationEmailError,
} from "@/lib/auth/email-verification-server";
import { isMailerConfigured } from "@/lib/email/send-email";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { firstFieldErrors } from "@/lib/validation";
import { inviteUserSchema } from "@/lib/validation/user";
import { authErrorState, authFieldErrorState, authSuccessState } from "@/types/auth";

function fail(key: string, details: string | null = null) {
  return jsonAuthResponse(authErrorState(key, {}, details), { status: 400 });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context || !context.roles.includes("super_admin")) {
    return jsonAuthResponse(authErrorState("modules.users.errors.unauthorized"), { status: 403 });
  }

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") return invalidJsonResponse();

  const parsed = inviteUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonAuthResponse(authFieldErrorState(firstFieldErrors(parsed.error)));
  }

  if (!isMailerConfigured()) {
    return fail("modules.users.errors.emailNotConfigured");
  }

  const { email, firstName, lastName, roleKey } = parsed.data;

  // Still-pending invite: send a fresh code (60s cooldown applies) instead of
  // creating a second account or role assignment.
  if (await hasPendingVerification(email)) {
    const resent = await resendVerificationCode(email);
    if (resent.status === "success") return jsonAuthResponse(authSuccessState());
    if (resent.error === "resendCooldown") {
      return jsonAuthResponse(authFieldErrorState({ email: "modules.users.errors.inviteCooldown" }));
    }
    if (resent.error === "alreadyVerified") {
      return jsonAuthResponse(authFieldErrorState({ email: "modules.users.errors.alreadyExists" }));
    }
    return fail(resent.error === "emailFailed" ? "modules.users.errors.emailFailed" : "modules.users.errors.verificationSetup");
  }

  const admin = createServiceRoleClient();

  // createUser sends no email, so Supabase's own confirmation link is never sent;
  // the only email is the app's OTP below. No password yet: it's set after verifying.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
    },
  });

  if (createError || !created?.user?.id) {
    const msg = createError?.message?.toLowerCase() ?? "";
    if (createError?.code === "email_exists" || msg.includes("already") || msg.includes("registered")) {
      return jsonAuthResponse(authFieldErrorState({ email: "modules.users.errors.alreadyExists" }));
    }
    return fail("modules.users.errors.inviteFailed", createError?.message ?? null);
  }

  const newUserId = created.user.id;

  // Role RPC runs as the caller so its super-admin checks and audit log apply.
  const supabase = await createClient();
  const { error: roleError } = await supabase.rpc("assign_user_role", {
    target_user_id: newUserId,
    role_key: roleKey,
    target_branch_id: null,
  });
  if (roleError) {
    await admin.auth.admin.deleteUser(newUserId);
    return fail("modules.users.errors.inviteFailed", roleError.message);
  }

  try {
    await startInviteVerification({ userId: newUserId, email });
  } catch (error) {
    // No code means the person can never verify, so don't leave a dangling account.
    await admin.auth.admin.deleteUser(newUserId);
    return fail(
      error instanceof VerificationEmailError
        ? "modules.users.errors.emailFailed"
        : "modules.users.errors.verificationSetup",
    );
  }

  return jsonAuthResponse(authSuccessState());
}
