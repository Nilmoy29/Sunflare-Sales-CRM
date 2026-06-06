import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { searchContactsForCalls } from "@/features/contacts/search-contacts";
import { contactSearchQuerySchema } from "@/lib/validators/contacts";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = contactSearchQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid search query",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const contacts = await searchContactsForCalls(
      parsed.data.q,
      parsed.data.limit,
    );
    return apiSuccess({ contacts });
  } catch {
    return apiError(
      "CONTACT_SEARCH_FAILED",
      "Could not search contacts",
      500,
    );
  }
}
