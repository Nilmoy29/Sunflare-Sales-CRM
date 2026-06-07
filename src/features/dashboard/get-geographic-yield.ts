import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  geographicYieldResponseSchema,
  geographicYieldRowSchema,
  type GeographicYieldResponse,
} from "@/lib/validators/geographic-yield";

export async function getGeographicYield(
  from: string,
  to: string,
): Promise<GeographicYieldResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_geographic_yield", {
    p_from: startOfDaySydney(from),
    p_to: endOfDaySydney(to),
  } as never);

  if (error) {
    throw error;
  }

  const rows = geographicYieldRowSchema.array().parse((data ?? []) as unknown[]);

  return geographicYieldResponseSchema.parse({ from, to, rows });
}
