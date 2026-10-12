import { jsonError, jsonOk, requireApiUser } from "@/lib/api/http";
import { updateBooking } from "@/lib/bookings/service";
import { bookingActionSchema } from "@/lib/validation/booking";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser("reservation.view");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = bookingActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("validation", "Invalid action.", 400);

  const result = await updateBooking(id, parsed.data, auth.context);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, result.error.code === "forbidden" ? 403 : 400);
  }
  return jsonOk({ ok: true });
}
