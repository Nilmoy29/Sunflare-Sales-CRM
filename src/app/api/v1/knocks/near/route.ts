import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getKnocksNearPoint } from "@/features/knocks/get-knocks-near";
import { getActiveShiftForRep } from "@/features/shifts/queries";
import { z } from "zod";

const nearQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const active = await getActiveShiftForRep(auth.id);
  if (!active) {
    return apiError(
      "NO_ACTIVE_SHIFT",
      "Start a shift to view knock history",
      403,
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = nearQuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
    radius: searchParams.get("radius") ?? undefined,
  });

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid lat/lng",
      400,
    );
  }

  try {
    const result = await getKnocksNearPoint(
      parsed.data.lat,
      parsed.data.lng,
      parsed.data.radius,
    );
    return apiSuccess(result);
  } catch {
    return apiError(
      "KNOCKS_NEAR_FAILED",
      "Could not load knock history",
      500,
    );
  }
}
