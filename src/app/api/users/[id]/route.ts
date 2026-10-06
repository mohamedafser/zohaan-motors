import { jsonAuthResponse, invalidJsonResponse, readJsonBody } from "@/lib/auth/http";
import { getUserContext } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { authErrorState, authSuccessState } from "@/types/auth";
import { updateUserSchema } from "@/lib/validation/user";
import { firstFieldErrors } from "@/lib/validation";

async function guardSuperAdmin() {
  const context = await getUserContext();
  if (!context || !context.roles.includes("super_admin")) return null;
  return context;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await guardSuperAdmin();
  if (!context) {
    return jsonAuthResponse(authErrorState("modules.users.errors.unauthorized"), { status: 403 });
  }

  const { id } = await params;
  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") return invalidJsonResponse();

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonAuthResponse({ status: "error", formError: null, fieldErrors: firstFieldErrors(parsed.error), redirectTo: null, details: null }, { status: 400 });
  }

  const { email, firstName, lastName } = parsed.data;
  const admin = createServiceRoleClient();

  // Update email in auth if provided
  if (email) {
    const { error } = await admin.auth.admin.updateUserById(id, { email });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered")) {
        return jsonAuthResponse(authErrorState("modules.users.errors.alreadyExists"), { status: 400 });
      }
      return jsonAuthResponse(authErrorState("modules.users.errors.updateFailed"), { status: 400 });
    }
  }

  // Update profile name fields if provided
  if (firstName || lastName) {
    const { data: current } = await admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", id)
      .maybeSingle();
    const fn = firstName ?? current?.first_name ?? "";
    const ln = lastName ?? current?.last_name ?? "";
    const display_name = `${fn} ${ln}`.trim();

    const profilePatch = {
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      display_name,
    };

    const { error } = await admin
      .from("profiles")
      .update(profilePatch)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) {
      return jsonAuthResponse(authErrorState("modules.users.errors.updateFailed"), { status: 400 });
    }
  }

  return jsonAuthResponse(authSuccessState());
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await guardSuperAdmin();
  if (!context) {
    return jsonAuthResponse(authErrorState("modules.users.errors.unauthorized"), { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === context.userId) {
    return jsonAuthResponse(authErrorState("modules.users.errors.removeFailed"), { status: 400 });
  }

  const admin = createServiceRoleClient();

  const { data: target } = await admin
    .from("profiles")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  // Never-accepted invites have no history to keep; delete fully so the email can be re-invited.
  if (target?.status === "invited") {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      return jsonAuthResponse(authErrorState("modules.users.errors.removeFailed"), { status: 400 });
    }
    return jsonAuthResponse(authSuccessState());
  }

  // Soft delete: set deleted_at and deleted_by on profile
  const { error: profileError } = await admin
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId })
    .eq("id", id)
    .is("deleted_at", null);

  if (profileError) {
    return jsonAuthResponse(authErrorState("modules.users.errors.removeFailed"), { status: 400 });
  }

  // Sign out the removed user
  await admin.auth.admin.signOut(id, "global").catch(() => null);

  return jsonAuthResponse(authSuccessState());
}
