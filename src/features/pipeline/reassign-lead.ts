import { enrichPipelineLeads } from "@/features/pipeline/enrich-pipeline-leads";
import {
  parsePipelineLeadRow,
  PIPELINE_LEAD_SELECT,
} from "@/features/pipeline/parse-pipeline-lead";
import { createClient } from "@/lib/supabase/server";
import type { PipelineLeadCard } from "@/lib/validators/pipeline";

async function enrichLeadCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
): Promise<PipelineLeadCard | null> {
  const { data, error } = await supabase
    .from("leads")
    .select(PIPELINE_LEAD_SELECT)
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const base = parsePipelineLeadRow(data as Record<string, unknown>);
  if (!base) {
    return null;
  }

  const [enriched] = await enrichPipelineLeads(supabase, [base]);
  return enriched ?? null;
}

export async function reassignLead(
  leadId: string,
  newRepId: string,
): Promise<PipelineLeadCard | null> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("id, rep_id")
    .eq("id", leadId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    return null;
  }

  const currentRepId = (existing as { rep_id?: string }).rep_id;
  if (currentRepId === newRepId) {
    return enrichLeadCard(supabase, leadId);
  }

  const { data: rep, error: repError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", newRepId)
    .eq("role", "rep")
    .maybeSingle();

  if (repError) {
    throw repError;
  }

  if (!rep) {
    throw new Error("INVALID_REP");
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ rep_id: newRepId } as never)
    .eq("id", leadId)
    .select(PIPELINE_LEAD_SELECT)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { error: followUpError } = await supabase
    .from("follow_ups")
    .update({ rep_id: newRepId } as never)
    .eq("lead_id", leadId)
    .eq("completed", false);

  if (followUpError) {
    throw followUpError;
  }

  return enrichLeadCard(supabase, leadId);
}
