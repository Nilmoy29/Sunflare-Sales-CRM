import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import {
  funnelConversionResponseSchema,
  funnelStageRowSchema,
  type FunnelConversionResponse,
} from "@/lib/validators/funnel-conversion";

export async function getFunnelConversion(
  from: string,
  to: string,
): Promise<FunnelConversionResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_funnel_conversion", {
    p_from: startOfDaySydney(from),
    p_to: endOfDaySydney(to),
  } as never);

  if (error) {
    throw error;
  }

  const stages = funnelStageRowSchema.array().parse(data ?? []);

  return funnelConversionResponseSchema.parse({ from, to, stages });
}
