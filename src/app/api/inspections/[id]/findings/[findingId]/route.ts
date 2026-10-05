import { firstFieldErrors } from "@/lib/validation";
import { updateInspectionFindingSchema } from "@/lib/validation/inspection";
import { jsonError, jsonOk, readJsonBody, requireApiUser } from "@/lib/api/http";
import { deleteFinding, updateFinding } from "@/lib/inspections/service";

function statusForCode(code: string) {
  if (code === "forbidden") return 403;
  if (code === "not_found") return 404;
  if (code === "invalid_transition" || code === "conflict") return 409;
  return 400;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; findingId: string }> },
) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return jsonError("validation", "Invalid JSON body.", 400);
  }

  const parsed = updateInspectionFindingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation", "Please correct the highlighted fields.", 400, {
      fieldErrors: firstFieldErrors(parsed.error),
    });
  }

  const { id, findingId } = await context.params;
  const result = await updateFinding(id, findingId, parsed.data, auth.context);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, statusForCode(result.error.code));
  }
  return jsonOk(result.data);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; findingId: string }> },
) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id, findingId } = await context.params;
  const result = await deleteFinding(id, findingId, auth.context);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, statusForCode(result.error.code));
  }
  return jsonOk(result.data);
}
