import { firstFieldErrors } from "@/lib/validation";
import {
  createInspectionSchema,
  inspectionListQuerySchema,
} from "@/lib/validation/inspection";
import { jsonError, jsonOk, readJsonBody, requireApiUser } from "@/lib/api/http";
import { createInspection, listInspections } from "@/lib/inspections/service";

function statusForCode(code: string) {
  if (code === "forbidden") return 403;
  if (code === "not_found") return 404;
  if (code === "invalid_transition" || code === "conflict") return 409;
  return 400;
}

export async function GET(request: Request) {
  const auth = await requireApiUser("inspection.view");
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = inspectionListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("validation", "Invalid query parameters.", 400, {
      fieldErrors: firstFieldErrors(parsed.error),
    });
  }

  const result = await listInspections(parsed.data, auth.context);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, statusForCode(result.error.code));
  }
  return jsonOk(result.data);
}

export async function POST(request: Request) {
  const auth = await requireApiUser("inspection.create");
  if ("response" in auth) return auth.response;

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return jsonError("validation", "Invalid JSON body.", 400);
  }

  const parsed = createInspectionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation", "Please correct the highlighted fields.", 400, {
      fieldErrors: firstFieldErrors(parsed.error),
    });
  }

  const result = await createInspection(parsed.data, auth.context);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, statusForCode(result.error.code));
  }

  return jsonOk(result.data, { status: 201 });
}
