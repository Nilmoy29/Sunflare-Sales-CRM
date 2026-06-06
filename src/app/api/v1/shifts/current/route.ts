import { apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getActiveShiftForRep } from "@/features/shifts/queries";

export async function GET() {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const active = await getActiveShiftForRep(auth.id);
  return apiSuccess(active);
}
