import { DOOR_OUTCOME_LABELS } from "@/lib/geo/door-outcome-colors";
import type { ActivityFeedItem } from "@/lib/validators/activity-feed";
import type { DoorOutcome } from "@/lib/validators/enums";

type KnockActivityRow = {
  id: string;
  rep_id: string;
  rep_name: string;
  outcome: DoorOutcome;
  knocked_at: string;
  lat: number;
  lng: number;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
};

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

export function mapKnockRowToActivityItem(
  row: KnockActivityRow,
): ActivityFeedItem {
  return {
    id: row.id,
    type: "door_knock",
    rep_id: row.rep_id,
    rep_name: row.rep_name,
    occurred_at: normalizeTimestamp(row.knocked_at),
    action_label: "Door knock",
    outcome: row.outcome,
    address: row.address,
    suburb: row.suburb,
    postcode: row.postcode,
    lat: row.lat,
    lng: row.lng,
  };
}

export function formatActivityOutcomeLabel(outcome: DoorOutcome): string {
  return DOOR_OUTCOME_LABELS[outcome];
}

export type { KnockActivityRow };
