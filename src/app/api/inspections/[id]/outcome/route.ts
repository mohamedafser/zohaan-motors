import { firstFieldErrors } from "@/lib/validation";
import { updateInspectionOutcomeSchema } from "@/lib/validation/inspection";
import { jsonError, jsonOk, readJsonBody, requireApiUser } from "@/lib/api/http";
import { updateApprovedInspectionOutcome } from "@/lib/inspections/service";

function statusForCode(code: string) {
  if (code === "forbidden") return 403;
  if (code === "not_found") return 404;
  if (code === "invalid_transition" || code === "conflict") return 409;
  return 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const body = await readJsonBody(request);
  const parsed = updateInspectionOutcomeSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonError("validation", "Please correct the highlighted fields.", 400, {
      fieldErrors: firstFieldErrors(parsed.error),
    });
  }

  const { id } = await context.params;
  const result = await updateApprovedInspectionOutcome(id, parsed.data, auth.context);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, statusForCode(result.error.code));
  }
  return jsonOk(result.data);
}
