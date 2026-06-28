import { parseStageChangeContent } from "@/lib/validators/lead-activity";
import {
  parseBookingFollowUpNote,
  pickLatestNote,
} from "@/features/pipeline/parse-booking-metadata";
import {
  pipelineLeadCardSchema,
  type PipelineLeadCard,
  type PipelineLeadCardBase,
} from "@/lib/validators/pipeline";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type FollowUpRow = {
  id: string;
  lead_id: string;
  due_at: string;
  note: string;
  created_at: string;
  completed: boolean;
};

type NoteRow = {
  lead_id: string;
  content: string;
  created_at: string;
};

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

function buildLatestNoteMap(rows: NoteRow[]): Map<string, NoteRow> {
  const map = new Map<string, NoteRow>();
  for (const row of rows) {
    const existing = map.get(row.lead_id);
    if (!existing || row.created_at > existing.created_at) {
      map.set(row.lead_id, row);
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

function buildPrimaryFollowUpMap(rows: FollowUpRow[]): Map<string, FollowUpRow> {
  const map = new Map<string, FollowUpRow>();
  for (const row of rows) {
    if (row.completed) {
      continue;
    }
    const existing = map.get(row.lead_id);
    if (!existing || row.due_at < existing.due_at) {
      map.set(row.lead_id, row);
    }
  }
  return map;
}

function buildEarliestDueMapIncomplete(rows: FollowUpRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.completed) {
      continue;
    }
    const existing = map.get(row.lead_id);
    if (!existing || row.due_at < existing) {
      map.set(row.lead_id, row.due_at);
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

  const [activityResult, followUpResult, noteResult, stageChangeResult, knockResult] =
    await Promise.all([
      supabase
        .from("lead_activity")
        .select("lead_id, created_at")
        .in("lead_id", leadIds),
      supabase
        .from("follow_ups")
        .select("id, lead_id, due_at, note, created_at, completed")
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
      supabase
        .from("leads")
        .select("id, door_knocks ( notes, follow_up_at )")
        .in("id", leadIds),
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
  if (knockResult.error) {
    throw knockResult.error;
  }

  const latestActivity = buildLatestActivityMap(
    (activityResult.data ?? []) as { lead_id: string; created_at: string }[],
  );
  const followUpRows = (followUpResult.data ?? []) as FollowUpRow[];
  const earliestDue = buildEarliestDueMapIncomplete(followUpRows);
  const bookedAt = buildEarliestDueMap(followUpRows);
  const primaryFollowUps = buildPrimaryFollowUpMap(followUpRows);
  const latestNotes = buildLatestNoteMap((noteResult.data ?? []) as NoteRow[]);
  const proposalSentAt = buildProposalSentMap(
    (stageChangeResult.data ?? []) as {
      lead_id: string;
      content: string;
      created_at: string;
    }[],
  );

  const knockNotesByLead = new Map<string, { notes: string | null; follow_up_at: string | null }>();
  for (const row of knockResult.data ?? []) {
    const record = row as {
      id?: string;
      door_knocks?: { notes?: string | null; follow_up_at?: string | null } | null;
    };
    if (!record.id) {
      continue;
    }
    const knock = record.door_knocks;
    knockNotesByLead.set(record.id, {
      notes: knock?.notes ?? null,
      follow_up_at:
        typeof knock?.follow_up_at === "string" ? knock.follow_up_at : null,
    });
  }

  return cards.map((card) => {
    const followUp = primaryFollowUps.get(card.id);
    const parsedBooking = parseBookingFollowUpNote(followUp?.note);
    const knock = knockNotesByLead.get(card.id);
    const activityNote = latestNotes.get(card.id);

    const bookingNotes =
      parsedBooking.booking_notes ??
      (knock?.notes?.trim() ? knock.notes.trim() : null);

    const booked_at =
      bookedAt.get(card.id) ??
      knock?.follow_up_at ??
      null;

    const latest_note = pickLatestNote(
      activityNote?.content ?? null,
      activityNote?.created_at ?? null,
      bookingNotes,
      followUp?.created_at ?? null,
    );

    return pipelineLeadCardSchema.parse({
      ...card,
      last_touch_at: maxIso(
        latestActivity.get(card.id) ?? card.updated_at,
        card.updated_at,
      ),
      next_action_due_at: earliestDue.get(card.id) ?? null,
      next_follow_up_id: followUp?.id ?? null,
      next_follow_up_note: followUp?.note?.trim() ? followUp.note.trim() : null,
      booked_at,
      closer_name: parsedBooking.closer_name,
      booking_notes: bookingNotes,
      proposal_sent_at: proposalSentAt.get(card.id) ?? null,
      latest_note,
      latest_note_at: activityNote?.created_at ?? null,
    });
  });
}
