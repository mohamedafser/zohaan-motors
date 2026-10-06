import { headers } from "next/headers";

import { jsonAuthResponse, invalidJsonResponse, readJsonBody } from "@/lib/auth/http";
import { getUserContext } from "@/lib/auth/session";
import { inviteEmail } from "@/lib/email/invite-email";
import { isMailerConfigured, sendMail } from "@/lib/email/mailer";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { firstFieldErrors } from "@/lib/validation";
import { inviteUserSchema } from "@/lib/validation/user";
import { authErrorState, authFieldErrorState, authSuccessState } from "@/types/auth";

async function siteOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";
}

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
  const admin = createServiceRoleClient();

  // Creates the invited user and a one-time token without Supabase sending any email.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
      },
    },
  });

  if (linkError || !link?.user?.id || !link.properties?.hashed_token) {
    const msg = linkError?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return jsonAuthResponse(authFieldErrorState({ email: "modules.users.errors.alreadyExists" }));
    }
    return fail("modules.users.errors.inviteFailed", linkError?.message ?? null);
  }

  const newUserId = link.user.id;

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

  const verifyUrl = new URL("/accept-invitation", await siteOrigin());
  verifyUrl.searchParams.set("token_hash", link.properties.hashed_token);
  verifyUrl.searchParams.set("type", "invite");

  try {
    await sendMail({ to: email, ...inviteEmail({ firstName, link: verifyUrl.toString() }) });
  } catch (error) {
    // No email means the person can never accept, so don't leave a dangling invite.
    await admin.auth.admin.deleteUser(newUserId);
    return fail(
      "modules.users.errors.emailFailed",
      error instanceof Error ? error.message : null,
    );
  }

  return jsonAuthResponse(authSuccessState());
}
