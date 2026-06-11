import { createClient } from "@/lib/supabase/server";
import { DOOR_OUTCOMES, type DoorOutcome } from "@/lib/validators/enums";
import type { RepShiftSummary } from "@/lib/validators/shifts";

const EMPTY_COUNTS: Omit<RepShiftSummary, "date"> = {
  doors: 0,
  door_outcomes: [],
  calls: 0,
  leads_added: 0,
  appointments_set: 0,
};

function aggregateDoorOutcomes(
  rows: { outcome: DoorOutcome }[],
): RepShiftSummary["door_outcomes"] {
  const counts = new Map<DoorOutcome, number>();

  for (const row of rows) {
    counts.set(row.outcome, (counts.get(row.outcome) ?? 0) + 1);
  }

  return DOOR_OUTCOMES.filter((outcome) => (counts.get(outcome) ?? 0) > 0)
    .map((outcome) => ({
      outcome,
      count: counts.get(outcome) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getRepShiftSummary(
  repId: string,
  startedAt: string,
  endedAt: string,
): Promise<Omit<RepShiftSummary, "date">> {
  try {
    const supabase = await createClient();

    const [knocksRes, callsRes, apptsRes, leadsRes] = await Promise.all([
      supabase
        .from("door_knocks")
        .select("outcome")
        .eq("rep_id", repId)
        .gte("knocked_at", startedAt)
        .lte("knocked_at", endedAt),
      supabase
        .from("call_logs")
        .select("id", { count: "exact", head: true })
        .eq("rep_id", repId)
        .gte("called_at", startedAt)
        .lte("called_at", endedAt),
      supabase
        .from("leads")
        .select("created_at, updated_at")
        .eq("rep_id", repId)
        .eq("stage", "appointment_set")
        .gte("updated_at", startedAt)
        .lte("updated_at", endedAt),
      supabase.rpc("count_rep_interested_leads", {
        p_rep_id: repId,
        p_from: startedAt,
        p_to: endedAt,
      } as never),
    ]);

    if (knocksRes.error) {
      throw knocksRes.error;
    }
    if (callsRes.error) {
      throw callsRes.error;
    }
    if (apptsRes.error) {
      throw apptsRes.error;
    }
    if (leadsRes.error) {
      throw leadsRes.error;
    }

    const leadsCountData = (leadsRes as { data: unknown }).data;
    const interestedLeadsCount =
      typeof leadsCountData === "number" ? leadsCountData : 0;

    const knocks = (knocksRes.data ?? []) as { outcome: DoorOutcome }[];
    const apptCandidates = (apptsRes.data ?? []) as {
      created_at: string;
      updated_at: string;
    }[];
    const appointments_set = apptCandidates.filter(
      (lead) => lead.updated_at > lead.created_at,
    ).length;

    return {
      doors: knocks.length,
      door_outcomes: aggregateDoorOutcomes(knocks),
      calls: callsRes.count ?? 0,
      leads_added: interestedLeadsCount,
      appointments_set,
    };
  } catch {
    return { ...EMPTY_COUNTS };
  }
}
