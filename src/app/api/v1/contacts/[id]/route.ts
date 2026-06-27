import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { updateContact } from "@/features/contacts/update-contact";
import { updateContactBodySchema } from "@/lib/validators/contacts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin", "rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid contact id", 400);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = updateContactBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid contact payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const contact = await updateContact(id, parsed.data);
    if (!contact) {
      return apiError("CONTACT_NOT_FOUND", "Contact not found", 404);
    }
    return apiSuccess({ contact });
  } catch {
    return apiError("CONTACT_UPDATE_FAILED", "Could not update contact", 500);
  }
}
