import { jsonError, jsonOk, requireApiUser } from "@/lib/api/http";
import { deleteInspectionPhoto } from "@/lib/inspections/service";

function statusForCode(code: string) {
  if (code === "forbidden") return 403;
  if (code === "not_found") return 404;
  if (code === "invalid_transition" || code === "conflict") return 409;
  return 400;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; photoId: string }> },
) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { id, photoId } = await context.params;
  const result = await deleteInspectionPhoto(id, photoId, auth.context);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, statusForCode(result.error.code));
  }
  return jsonOk(result.data);
}
