import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { createLeadNote } from "@/features/pipeline/create-lead-note";
import { createLeadNoteBodySchema } from "@/lib/validators/lead-activity";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin", "rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid lead id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const parsed = createLeadNoteBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  try {
    const note = await createLeadNote(id, auth.id, parsed.data.content);
    if (!note) {
      return apiError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    return apiSuccess({ note });
  } catch {
    return apiError("NOTE_CREATE_FAILED", "Could not create note", 500);
  }
}
