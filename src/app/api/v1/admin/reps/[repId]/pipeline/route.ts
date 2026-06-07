import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getRepProfile } from "@/features/admin/get-rep-profile";
import { getRepPipelineSnapshot } from "@/features/dashboard/get-rep-pipeline-snapshot";
import { repIdParamSchema } from "@/lib/validators/rep-deep-dive";

type RouteContext = {
  params: Promise<{ repId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { repId } = await context.params;
  const parsedRepId = repIdParamSchema.safeParse(repId);
  if (!parsedRepId.success) {
    return apiError("NOT_FOUND", "Rep not found", 404);
  }

  const rep = await getRepProfile(parsedRepId.data);
  if (!rep) {
    return apiError("NOT_FOUND", "Rep not found", 404);
  }

  try {
    const snapshot = await getRepPipelineSnapshot(parsedRepId.data);
    return apiSuccess(snapshot);
  } catch {
    return apiError(
      "REP_PIPELINE_SNAPSHOT_FAILED",
      "Could not load rep pipeline snapshot",
      500,
    );
  }
}
