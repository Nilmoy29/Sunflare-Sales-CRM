import { createClient } from "@/lib/supabase/server";
import {
  endOfDaySydney,
  startOfDaySydney,
  callHistoryResponseSchema,
  parseCallHistoryRow,
  type CallHistoryQuery,
  type CallHistoryResponse,
} from "@/lib/validators/call-logs";

const MY_CALLS_SELECT = `
  id,
  contact_id,
  rep_id,
  outcome,
  duration_seconds,
  notes,
  called_at,
  follow_up_at,
  contacts!call_logs_contact_id_fkey (
    first_name,
    last_name,
    phone,
    address,
    suburb
  ),
  leads ( id )
`;

export async function getMyCalls(
  repId: string,
  query: CallHistoryQuery,
): Promise<CallHistoryResponse> {
  const supabase = await createClient();
  const rangeStart = startOfDaySydney(query.from);
  const rangeEnd = endOfDaySydney(query.to);
  const fetchLimit = query.limit + 1;

  let builder = supabase
    .from("call_logs")
    .select(MY_CALLS_SELECT)
    .eq("rep_id", repId)
    .gte("called_at", rangeStart)
    .lte("called_at", rangeEnd)
    .order("called_at", { ascending: false })
    .range(query.offset, query.offset + fetchLimit - 1);

  if (query.outcome.length > 0) {
    builder = builder.in("outcome", query.outcome);
  }

  const { data, error } = await builder;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const calls = rows
    .map((row) => parseCallHistoryRow(row))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const truncated = calls.length > query.limit;
  const pageCalls = truncated ? calls.slice(0, query.limit) : calls;

  return callHistoryResponseSchema.parse({
    calls: pageCalls,
    total: null,
    truncated,
  });
}
