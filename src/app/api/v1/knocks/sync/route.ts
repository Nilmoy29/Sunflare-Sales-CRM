import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { createKnockWithContact } from "@/features/knocks/create-knock";
import { getActiveShiftForRep } from "@/features/shifts/queries";
import {
  syncKnockResultSchema,
  syncKnocksBodySchema,
  type SyncKnockResult,
} from "@/lib/validators/knocks";

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const active = await getActiveShiftForRep(auth.id);
  if (!active) {
    return apiError(
      "NO_ACTIVE_SHIFT",
      "Start a shift to sync knocks",
      403,
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = syncKnocksBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid sync payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const results: SyncKnockResult[] = [];

    for (const item of parsed.data.knocks) {
      const { client_id, idempotency_key, ...body } = item;
      const created = await createKnockWithContact(body, idempotency_key);
      const result = syncKnockResultSchema.parse({
        client_id,
        status: created.duplicate ? "duplicate" : "created",
        knock: created.knock,
        ...(created.lead ? { lead: created.lead } : {}),
      });
      results.push(result);
    }

    return apiSuccess({ results });
  } catch {
    return apiError("SYNC_FAILED", "Could not sync pending knocks", 500);
  }
}
