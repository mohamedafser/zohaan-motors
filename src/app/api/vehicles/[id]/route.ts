import { firstFieldErrors } from "@/lib/validation";
import { updateVehicleSchema } from "@/lib/validation/vehicle";
import { jsonError, jsonOk, readJsonBody, requireApiUser } from "@/lib/api/http";
import { getVehicle, updateVehicle } from "@/lib/vehicles/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiUser("vehicle.view");
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const result = await getVehicle(id, auth.context);
  if (result.error) {
    const status = result.error.code === "not_found" ? 404 : 400;
    return jsonError(result.error.code, result.error.message, status);
  }
  return jsonOk(result.data);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUser("vehicle.edit");
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return jsonError("validation", "Invalid JSON body.", 400);
  }

  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation", "Please correct the highlighted fields.", 400, {
      fieldErrors: firstFieldErrors(parsed.error),
    });
  }

  const result = await updateVehicle(id, parsed.data, auth.context);
  if (result.error) {
    const status =
      result.error.code === "forbidden"
        ? 403
        : result.error.code === "not_found"
          ? 404
          : result.error.code === "duplicate_vin" || result.error.code === "duplicate_chassis"
            ? 409
            : 400;
    return jsonError(result.error.code, result.error.message, status, {
      details: result.error.existingVehicleId
        ? { existingVehicleId: result.error.existingVehicleId }
        : undefined,
    });
  }

  return jsonOk(result.data);
}
