import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth/session";
import { listUsers } from "@/lib/users/service";
import { authErrorState } from "@/types/auth";
import { jsonAuthResponse } from "@/lib/auth/http";

export async function GET() {
  const context = await getUserContext();
  if (!context || !context.roles.includes("super_admin")) {
    return jsonAuthResponse(authErrorState("modules.users.errors.unauthorized"), { status: 403 });
  }

  const users = await listUsers();
  return NextResponse.json(users);
}
