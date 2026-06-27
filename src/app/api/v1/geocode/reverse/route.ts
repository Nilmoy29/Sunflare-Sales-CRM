import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  GeocodeFailedError,
  GeocodeNotConfiguredError,
  reverseGeocode,
} from "@/features/geocode/reverse-geocode";
import { reverseGeocodeQuerySchema } from "@/lib/validators/geocode";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = reverseGeocodeQuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
  });

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid coordinates",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const result = await reverseGeocode(parsed.data.lat, parsed.data.lng);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof GeocodeNotConfiguredError) {
      return apiError(
        "GEOCODE_NOT_CONFIGURED",
        "Address lookup is not configured. Add MAPBOX_SECRET_TOKEN — see docs/SETUP_KEYS.md",
        503,
      );
    }
    if (error instanceof GeocodeFailedError) {
      return apiError(
        "GEOCODE_FAILED",
        "Could not look up address for these coordinates",
        502,
      );
    }
    return apiError("GEOCODE_FAILED", "Could not look up address", 502);
  }
}
