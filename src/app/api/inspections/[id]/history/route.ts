import { jsonError, jsonOk, requireApiUser } from "@/lib/api/http";
import { getInspectionHistory } from "@/lib/inspections/service";

function statusForCode(code: string) {
  if (code === "forbidden") return 403;
  if (code === "not_found") return 404;
  if (code === "invalid_transition" || code === "conflict") return 409;
  return 400;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("inspection.view");
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const result = await getInspectionHistory(id);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, statusForCode(result.error.code));
  }
  return jsonOk(result.data);
}
