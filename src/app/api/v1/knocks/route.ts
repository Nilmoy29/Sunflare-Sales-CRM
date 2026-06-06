import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { createKnockWithContact } from "@/features/knocks/create-knock";
import { getKnocksInBbox } from "@/features/knocks/queries";
import { getActiveShiftForRep } from "@/features/shifts/queries";
import {
  createKnockBodySchema,
  parseBboxParam,
} from "@/lib/validators/knocks";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const active = await getActiveShiftForRep(auth.id);
  if (!active) {
    return apiError(
      "NO_ACTIVE_SHIFT",
      "Start a shift to view knock pins",
      403,
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseBboxParam(searchParams.get("bbox"));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error, 400);
  }

  try {
    const result = await getKnocksInBbox(auth.id, parsed.data);
    return apiSuccess(result);
  } catch {
    return apiError("KNOCKS_FETCH_FAILED", "Could not load knock pins", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const active = await getActiveShiftForRep(auth.id);
  if (!active) {
    return apiError(
      "NO_ACTIVE_SHIFT",
      "Start a shift to log knocks",
      403,
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = createKnockBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid knock payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const { knock, lead } = await createKnockWithContact(parsed.data);
    return apiSuccess(lead ? { knock, lead } : { knock });
  } catch {
    return apiError("KNOCK_CREATE_FAILED", "Could not save knock", 500);
  }
}
