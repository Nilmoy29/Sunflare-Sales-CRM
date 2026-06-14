import { parseStageChangeContent } from "@/lib/validators/lead-activity";
import {
  pipelineLeadCardSchema,
  type PipelineLeadCard,
  type PipelineLeadCardBase,
} from "@/lib/validators/pipeline";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

function buildLatestActivityMap(
  rows: { lead_id: string; created_at: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const existing = map.get(row.lead_id);
    if (!existing || row.created_at > existing) {
      map.set(row.lead_id, row.created_at);
    }
  }
  return map;
}

function buildEarliestDueMap(
  rows: { lead_id: string; due_at: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const existing = map.get(row.lead_id);
    if (!existing || row.due_at < existing) {
      map.set(row.lead_id, row.due_at);
    }
  }
  return map;
}

function buildLatestNoteMap(
  rows: { lead_id: string; content: string; created_at: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const existing = map.get(row.lead_id);
    if (!existing || row.created_at > existing) {
      map.set(row.lead_id, row.content);
    }
  }
  return map;
}

function buildProposalSentMap(
  rows: { lead_id: string; content: string; created_at: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const parsed = parseStageChangeContent(row.content);
    if (parsed?.to_stage !== "proposal_sent") {
      continue;
    }
    const existing = map.get(row.lead_id);
    if (!existing || row.created_at > existing) {
      map.set(row.lead_id, row.created_at);
    }
  }
  return map;
}

export async function enrichPipelineLeads(
  supabase: ServerSupabaseClient,
  cards: PipelineLeadCardBase[],
): Promise<PipelineLeadCard[]> {
  if (cards.length === 0) {
    return [];
  }

  const leadIds = cards.map((card) => card.id);

  const [activityResult, followUpResult, noteResult, stageChangeResult] =
    await Promise.all([
      supabase
        .from("lead_activity")
        .select("lead_id, created_at")
        .in("lead_id", leadIds),
      supabase
        .from("follow_ups")
        .select("lead_id, due_at")
        .in("lead_id", leadIds),
      supabase
        .from("lead_activity")
        .select("lead_id, content, created_at")
        .in("lead_id", leadIds)
        .eq("type", "note"),
      supabase
        .from("lead_activity")
        .select("lead_id, content, created_at")
        .in("lead_id", leadIds)
        .eq("type", "stage_change"),
    ]);

  if (activityResult.error) {
    throw activityResult.error;
  }
  if (followUpResult.error) {
    throw followUpResult.error;
  }
  if (noteResult.error) {
    throw noteResult.error;
  }
  if (stageChangeResult.error) {
    throw stageChangeResult.error;
  }

  const latestActivity = buildLatestActivityMap(
    (activityResult.data ?? []) as { lead_id: string; created_at: string }[],
  );
  const earliestDue = buildEarliestDueMap(
    (followUpResult.data ?? []) as { lead_id: string; due_at: string }[],
  );
  const bookedAt = buildEarliestDueMap(
    (followUpResult.data ?? []) as { lead_id: string; due_at: string }[],
  );
  const latestNotes = buildLatestNoteMap(
    (noteResult.data ?? []) as {
      lead_id: string;
      content: string;
      created_at: string;
    }[],
  );
  const proposalSentAt = buildProposalSentMap(
    (stageChangeResult.data ?? []) as {
      lead_id: string;
      content: string;
      created_at: string;
    }[],
  );

  return cards.map((card) =>
    pipelineLeadCardSchema.parse({
      ...card,
      last_touch_at: maxIso(
        latestActivity.get(card.id) ?? card.updated_at,
        card.updated_at,
      ),
      next_action_due_at: earliestDue.get(card.id) ?? null,
      booked_at: bookedAt.get(card.id) ?? null,
      proposal_sent_at: proposalSentAt.get(card.id) ?? null,
      latest_note: latestNotes.get(card.id) ?? null,
    }),
  );
}
