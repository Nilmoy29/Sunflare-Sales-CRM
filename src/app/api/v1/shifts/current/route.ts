import { apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getActiveShiftForRep } from "@/features/shifts/queries";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const active = await getActiveShiftForRep(auth.id);
  return apiSuccess(active);
}
