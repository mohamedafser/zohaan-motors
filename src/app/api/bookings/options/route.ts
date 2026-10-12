import { jsonError, jsonOk, requireApiUser } from "@/lib/api/http";
import { listBookingOptions } from "@/lib/bookings/service";

export async function GET() {
  const auth = await requireApiUser("reservation.create");
  if ("response" in auth) return auth.response;
  const result = await listBookingOptions(auth.context);
  if (result.error) return jsonError(result.error.code, result.error.message, 400);
  return jsonOk(result.data);
}
