import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getPipelineLeads } from "@/features/pipeline/get-pipeline-leads";
import { parsePipelineLeadsQueryFromSearchParams } from "@/lib/validators/pipeline";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin", "rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parsePipelineLeadsQueryFromSearchParams(searchParams);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  const query =
    auth.role === "admin"
      ? parsed.data
      : { ...parsed.data, rep_ids: undefined };

  try {
    const result = await getPipelineLeads(query, {
      isAdmin: auth.role === "admin",
    });
    return apiSuccess(result);
  } catch {
    return apiError(
      "PIPELINE_LEADS_FAILED",
      "Could not load pipeline leads",
      500,
    );
  }
}
