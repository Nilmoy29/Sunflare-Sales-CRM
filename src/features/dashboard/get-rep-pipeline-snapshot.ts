import { createClient } from "@/lib/supabase/server";
import {
  repPipelineSnapshotResponseSchema,
  repPipelineStageRowSchema,
  type RepPipelineSnapshotResponse,
} from "@/lib/validators/rep-deep-dive";

export async function getRepPipelineSnapshot(
  repId: string,
): Promise<RepPipelineSnapshotResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_admin_rep_pipeline_snapshot",
    {
      p_rep_id: repId,
    } as never,
  );

  if (error) {
    throw error;
  }

  const stages = repPipelineStageRowSchema.array().parse(
    (data ?? []) as unknown[],
  );

  return repPipelineSnapshotResponseSchema.parse({ rep_id: repId, stages });
}
