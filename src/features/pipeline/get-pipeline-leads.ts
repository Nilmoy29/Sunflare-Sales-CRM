import { enrichPipelineLeads } from "@/features/pipeline/enrich-pipeline-leads";
import {
  parsePipelineLeadRow,
  PIPELINE_LEAD_SELECT,
  pipelineLeadSelectWithSuburbFilter,
} from "@/features/pipeline/parse-pipeline-lead";
import {
  endOfDaySydney,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import { createClient } from "@/lib/supabase/server";
import {
  pipelineLeadsResponseSchema,
  type PipelineLeadsQuery,
  type PipelineLeadsResponse,
} from "@/lib/validators/pipeline";

export async function getPipelineLeads(
  query: PipelineLeadsQuery = {},
  options: { isAdmin: boolean } = { isAdmin: false },
): Promise<PipelineLeadsResponse> {
  const supabase = await createClient();
  const suburbFilter = query.suburb?.trim();
  const select = suburbFilter
    ? pipelineLeadSelectWithSuburbFilter()
    : PIPELINE_LEAD_SELECT;

  let request = supabase.from("leads").select(select);

  if (query.stages?.length) {
    request = request.in("stage", query.stages);
  }
  if (query.sources?.length) {
    request = request.in("source", query.sources);
  }
  if (query.rep_ids?.length && options.isAdmin) {
    request = request.in("rep_id", query.rep_ids);
  }
  if (suburbFilter) {
    request = request.ilike("contacts.suburb", `%${suburbFilter}%`);
  }
  if (query.from) {
    request = request.gte("updated_at", startOfDaySydney(query.from));
  }
  if (query.to) {
    request = request.lte("updated_at", endOfDaySydney(query.to));
  }

  const { data, error } = await request.order("updated_at", {
    ascending: false,
  });

  if (error) {
    throw error;
  }

  const baseLeads = (data ?? [])
    .map((row) => parsePipelineLeadRow(row as Record<string, unknown>))
    .filter((lead): lead is NonNullable<typeof lead> => lead !== null);

  const leads = await enrichPipelineLeads(supabase, baseLeads);

  return pipelineLeadsResponseSchema.parse({ leads });
}
