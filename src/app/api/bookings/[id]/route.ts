import { jsonError, jsonOk, requireApiUser } from "@/lib/api/http";
import { editBooking, updateBooking } from "@/lib/bookings/service";
import { invalidateBookingDeadlines } from "@/lib/notifications/service";
import { firstFieldErrors } from "@/lib/validation";
import { bookingActionSchema } from "@/lib/validation/booking";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser("reservation.view");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = bookingActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("validation", "Invalid action.", 400, { fieldErrors: firstFieldErrors(parsed.error) });
  }

  const { data: action } = parsed;
  const result =
    action.action === "edit"
      ? await editBooking(id, action, auth.context)
      : await updateBooking(id, action, auth.context);
  if (result.error) {
    return jsonError(result.error.code, result.error.message, result.error.code === "forbidden" ? 403 : 400, {
      fieldErrors: result.error.fieldErrors,
    });
  }
  invalidateBookingDeadlines();
  return jsonOk({ ok: true });
}
