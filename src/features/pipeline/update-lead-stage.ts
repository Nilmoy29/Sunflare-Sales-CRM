import { enrichPipelineLeads } from "@/features/pipeline/enrich-pipeline-leads";
import {
  parsePipelineLeadRow,
  PIPELINE_LEAD_SELECT,
} from "@/features/pipeline/parse-pipeline-lead";
import { createClient } from "@/lib/supabase/server";
import { serializeStageChangeContent } from "@/lib/validators/lead-activity";
import {
  leadStageSchema,
  type LeadStage,
  type LostReason,
} from "@/lib/validators/enums";
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

export async function updateLeadStage(
  leadId: string,
  stage: LeadStage,
  actorId: string,
  lostReason?: LostReason,
): Promise<PipelineLeadCard | null> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("id, stage")
    .eq("id", leadId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    return null;
  }

  const fromStageParsed = leadStageSchema.safeParse(
    (existing as { stage?: unknown }).stage,
  );
  if (!fromStageParsed.success) {
    return null;
  }

  const fromStage = fromStageParsed.data;
  if (fromStage === stage) {
    return enrichLeadCard(supabase, leadId);
  }

  if (stage === "lost" && !lostReason) {
    throw new Error("LOST_REASON_REQUIRED");
  }

  const { data, error } = await supabase
    .from("leads")
    .update({
      stage,
      lost_reason: stage === "lost" ? lostReason ?? null : null,
    } as never)
    .eq("id", leadId)
    .select(PIPELINE_LEAD_SELECT)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { error: activityError } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: actorId,
    type: "stage_change",
    content: serializeStageChangeContent(
      fromStage,
      stage,
      stage === "lost" ? lostReason : undefined,
    ),
  } as never);

  if (activityError) {
    throw activityError;
  }

  return enrichLeadCard(supabase, leadId);
}
