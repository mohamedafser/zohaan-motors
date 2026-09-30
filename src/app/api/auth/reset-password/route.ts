import { jsonAuthResponse, invalidJsonResponse, readJsonBody } from "@/lib/auth/http";
import { updatePassword } from "@/lib/auth/service";
import type { ResetPasswordValues } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") return invalidJsonResponse();

  const result = await updatePassword(body as ResetPasswordValues);
  return jsonAuthResponse(result);
}
