import type { DoorOutcome } from "@sunflare/shared";
import type { CallOutcome } from "@sunflare/shared";

export type KnockHistoryItem = {
  id: string;
  outcome: DoorOutcome;
  knocked_at: string;
  lat: number;
  lng: number;
  notes: string | null;
  follow_up_at: string | null;
  has_linked_lead: boolean;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
};

export type PendingKnockHistoryItem = {
  id: string;
  pending: true;
  outcome: DoorOutcome;
  knocked_at: string;
  lat: number;
  lng: number;
  notes: string | null;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
};

export type KnockHistoryResponse = {
  knocks: KnockHistoryItem[];
  total: number | null;
  truncated: boolean;
};

export type CallHistoryItem = {
  id: string;
  contact_id: string;
  rep_id: string;
  outcome: CallOutcome;
  duration_seconds: number | null;
  notes: string | null;
  called_at: string;
  follow_up_at: string | null;
  has_linked_lead: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  address: string | null;
  suburb: string | null;
};

export type CallHistoryResponse = {
  calls: CallHistoryItem[];
  total: number | null;
  truncated: boolean;
};

export const HISTORY_DEFAULT_LIMIT = 50;
