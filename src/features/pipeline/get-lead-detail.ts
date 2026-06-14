import {
  formatContactDisplayName,
  formatStageChangeDisplay,
} from "@/features/pipeline/pipeline-stage-labels";
import {
  type CallLogTimelineItem,
  parseCallLogTimelineRow,
} from "@/lib/validators/call-logs";
import { parseStageChangeContent } from "@/lib/validators/lead-activity";
import { createClient } from "@/lib/supabase/server";
import {
  leadDetailResponseSchema,
  type LeadDetailResponse,
  type LeadDetailTimelineItem,
} from "@/lib/validators/lead-detail";
import {
  doorOutcomeSchema,
  leadActivityTypeSchema,
  leadSourceSchema,
  leadStageSchema,
  lostReasonSchema,
} from "@/lib/validators/enums";

const LEAD_DETAIL_SELECT = `
  id,
  stage,
  source,
  rep_id,
  lost_reason,
  door_knock_id,
  contact_id,
  created_at,
  profiles!leads_rep_id_fkey ( name ),
  contacts!leads_contact_id_fkey ( first_name, last_name, address, suburb, postcode, phone )
`;

const KNOCK_DETAIL_SELECT = `
  id,
  rep_id,
  outcome,
  knocked_at,
  profiles!door_knocks_rep_id_fkey ( name ),
  contacts!door_knocks_contact_id_fkey ( address, suburb )
`;

const ACTIVITY_DETAIL_SELECT = `
  id,
  type,
  content,
  created_at,
  actor_id,
  profiles!lead_activity_actor_id_fkey ( name )
`;

const FOLLOW_UP_DETAIL_SELECT = `
  id,
  due_at,
  note,
  completed,
  rep_id,
  profiles!follow_ups_rep_id_fkey ( name )
`;

const CALL_DETAIL_SELECT = `
  id,
  contact_id,
  rep_id,
  outcome,
  duration_seconds,
  notes,
  called_at,
  follow_up_at,
  profiles!call_logs_rep_id_fkey ( name )
`;

function toIsoString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

function parseKnockRow(
  row: Record<string, unknown>,
  originKnockId: string | null,
): LeadDetailTimelineItem | null {
  const profiles = row.profiles as { name?: string } | null;
  const contacts = row.contacts as {
    address?: string | null;
    suburb?: string | null;
  } | null;
  const outcomeParsed = doorOutcomeSchema.safeParse(row.outcome);
  const knocked_at = toIsoString(row.knocked_at);

  if (
    typeof row.id !== "string" ||
    !profiles?.name ||
    !outcomeParsed.success ||
    !knocked_at
  ) {
    return null;
  }

  return {
    kind: "knock",
    id: row.id,
    occurred_at: knocked_at,
    rep_name: profiles.name,
    outcome: outcomeParsed.data,
    address: contacts?.address ?? null,
    suburb: contacts?.suburb ?? null,
    is_origin: originKnockId === row.id,
  };
}

function parseActivityRow(
  row: Record<string, unknown>,
): LeadDetailTimelineItem | null {
  const profiles = row.profiles as { name?: string } | null;
  const typeParsed = leadActivityTypeSchema.safeParse(row.type);
  const created_at = toIsoString(row.created_at);
  const content = typeof row.content === "string" ? row.content : "";

  if (
    typeof row.id !== "string" ||
    !profiles?.name ||
    !typeParsed.success ||
    !created_at
  ) {
    return null;
  }

  const base = {
    id: row.id,
    occurred_at: created_at,
    rep_name: profiles.name,
  };

  switch (typeParsed.data) {
    case "note":
      return { kind: "note", ...base, content: content || "(empty note)" };
    case "stage_change": {
      const parsed = parseStageChangeContent(content);
      if (parsed) {
        return {
          kind: "stage_change",
          ...base,
          from_stage: parsed.from_stage,
          to_stage: parsed.to_stage,
          content: formatStageChangeDisplay(
            parsed.from_stage,
            parsed.to_stage,
            parsed.lost_reason,
          ),
        };
      }
      return {
        kind: "stage_change",
        ...base,
        content: content || "Moved stage",
      };
    }
    case "call":
      return null;
    case "knock":
      return null;
    default:
      return null;
  }
}

function parseFollowUpRow(
  row: Record<string, unknown>,
): LeadDetailTimelineItem | null {
  const profiles = row.profiles as { name?: string } | null;
  const due_at = toIsoString(row.due_at);

  if (
    typeof row.id !== "string" ||
    !profiles?.name ||
    !due_at ||
    typeof row.completed !== "boolean"
  ) {
    return null;
  }

  return {
    kind: "follow_up",
    id: row.id,
    occurred_at: due_at,
    rep_name: profiles.name,
    due_at,
    note: typeof row.note === "string" ? row.note : "",
    completed: row.completed,
  };
}

export async function getLeadDetail(
  leadId: string,
): Promise<LeadDetailResponse | null> {
  const supabase = await createClient();

  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select(LEAD_DETAIL_SELECT)
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    throw leadError;
  }

  if (!leadRow) {
    return null;
  }

  const row = leadRow as Record<string, unknown>;
  const profiles = row.profiles as { name?: string } | null;
  const contacts = row.contacts as {
    first_name?: string | null;
    last_name?: string | null;
    address?: string | null;
    suburb?: string | null;
    postcode?: string | null;
    phone?: string | null;
  } | null;

  const stageParsed = leadStageSchema.safeParse(row.stage);
  const sourceParsed = leadSourceSchema.safeParse(row.source);
  const lostReasonParsed = lostReasonSchema.nullable().safeParse(
    row.lost_reason ?? null,
  );
  const created_at = toIsoString(row.created_at);
  const contact_id = typeof row.contact_id === "string" ? row.contact_id : null;
  const door_knock_id =
    typeof row.door_knock_id === "string" ? row.door_knock_id : null;

  if (
    typeof row.id !== "string" ||
    typeof row.rep_id !== "string" ||
    !profiles?.name ||
    !stageParsed.success ||
    !sourceParsed.success ||
    !lostReasonParsed.success ||
    !created_at ||
    !contact_id
  ) {
    return null;
  }

  const contact_name = formatContactDisplayName({
    first_name: contacts?.first_name ?? null,
    last_name: contacts?.last_name ?? null,
    address: contacts?.address ?? null,
    suburb: contacts?.suburb ?? null,
  });

  const [knocksResult, callsResult, activityResult, followUpsResult] =
    await Promise.all([
      supabase
        .from("door_knocks")
        .select(KNOCK_DETAIL_SELECT)
        .eq("contact_id", contact_id)
        .order("knocked_at", { ascending: false }),
      supabase
        .from("call_logs")
        .select(CALL_DETAIL_SELECT)
        .eq("contact_id", contact_id)
        .order("called_at", { ascending: false }),
      supabase
        .from("lead_activity")
        .select(ACTIVITY_DETAIL_SELECT)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("follow_ups")
        .select(FOLLOW_UP_DETAIL_SELECT)
        .eq("lead_id", leadId)
        .order("due_at", { ascending: true }),
    ]);

  if (knocksResult.error) {
    throw knocksResult.error;
  }
  if (callsResult.error) {
    throw callsResult.error;
  }
  if (activityResult.error) {
    throw activityResult.error;
  }
  if (followUpsResult.error) {
    throw followUpsResult.error;
  }

  const knockItems = (knocksResult.data ?? [])
    .map((knock) =>
      parseKnockRow(knock as Record<string, unknown>, door_knock_id),
    )
    .filter((item): item is LeadDetailTimelineItem => item !== null);

  const callItems: CallLogTimelineItem[] = (callsResult.data ?? [])
    .map((call) => parseCallLogTimelineRow(call as Record<string, unknown>))
    .filter((item): item is CallLogTimelineItem => item !== null);

  const activityItems = (activityResult.data ?? [])
    .map((activity) =>
      parseActivityRow(activity as Record<string, unknown>),
    )
    .filter((item): item is LeadDetailTimelineItem => item !== null);

  const followUpItems = (followUpsResult.data ?? [])
    .map((followUp) =>
      parseFollowUpRow(followUp as Record<string, unknown>),
    )
    .filter((item): item is LeadDetailTimelineItem => item !== null);

  const timeline = [
    ...knockItems,
    ...callItems,
    ...activityItems,
    ...followUpItems,
  ].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  return leadDetailResponseSchema.parse({
    lead: {
      id: row.id,
      contact_id,
      stage: stageParsed.data,
      source: sourceParsed.data,
      rep_id: row.rep_id,
      rep_name: profiles.name,
      contact_name,
      first_name: contacts?.first_name ?? null,
      last_name: contacts?.last_name ?? null,
      address: contacts?.address ?? null,
      suburb: contacts?.suburb ?? null,
      postcode: contacts?.postcode ?? null,
      phone: contacts?.phone ?? null,
      created_at,
      lost_reason: lostReasonParsed.data,
    },
    calls_available: true,
    timeline,
  });
}
