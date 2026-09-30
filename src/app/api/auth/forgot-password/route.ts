import { jsonAuthResponse, invalidJsonResponse, readJsonBody } from "@/lib/auth/http";
import { requestPasswordReset } from "@/lib/auth/service";
import type { ForgotPasswordValues } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") return invalidJsonResponse();

  const result = await requestPasswordReset(body as ForgotPasswordValues);
  return jsonAuthResponse(result);
}
