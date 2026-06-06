import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { createContactForRep } from "@/features/contacts/create-contact";
import { createContactBodySchema } from "@/lib/validators/contacts";

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = createContactBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid contact payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const outcome = await createContactForRep(auth.id, parsed.data);

    if (outcome.status === "duplicate") {
      return apiError(
        "DUPLICATE_CONTACT",
        "A contact with this phone number already exists",
        409,
        { contact: outcome.contact },
      );
    }

    return apiSuccess({ contact: outcome.contact });
  } catch {
    return apiError("CONTACT_CREATE_FAILED", "Could not create contact", 500);
  }
}
