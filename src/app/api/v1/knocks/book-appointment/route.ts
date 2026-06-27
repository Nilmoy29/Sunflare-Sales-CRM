import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { bookD2dAppointment } from "@/features/knocks/book-d2d-appointment";
import { getActiveShiftForRep } from "@/features/shifts/queries";
import { bookAppointmentBodySchema } from "@/lib/validators/book-appointment";

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const active = await getActiveShiftForRep(auth.id);
  if (!active) {
    return apiError(
      "NO_ACTIVE_SHIFT",
      "Start a shift to book appointments",
      403,
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = bookAppointmentBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid appointment payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const result = await bookD2dAppointment(parsed.data);
    return apiSuccess(result);
  } catch {
    return apiError(
      "APPOINTMENT_BOOK_FAILED",
      "Could not book appointment",
      500,
    );
  }
}
