import type { CallOutcome } from "@sunflare/shared";

export const CONTACT_SEARCH_MIN_LENGTH = 2;

export const CALL_NOTES_MAX_LENGTH = 2000;
export const CALL_DURATION_MINUTES_MAX = 480;

export type ContactSummary = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
};

export type ContactSearchResult = ContactSummary & {
  is_linked: boolean;
};

export type ContactSearchResponse = {
  contacts: ContactSearchResult[];
};

export type CreateContactBody = {
  first_name: string;
  last_name: string;
  phone: string;
  address?: string | null;
  suburb?: string | null;
  postcode?: string | null;
};

export type CallLogSummary = {
  id: string;
  contact_id: string;
  rep_id: string;
  outcome: CallOutcome;
  duration_seconds: number | null;
  notes: string | null;
  called_at: string;
  follow_up_at: string | null;
};

export type CreateCallBody = {
  contact_id: string;
  outcome: CallOutcome;
  duration_minutes?: number | null;
  notes?: string | null;
  follow_up_at?: string | null;
};

export type ContactCallHistoryItem = CallLogSummary & {
  rep_name: string;
  has_linked_lead: boolean;
};

export type ContactCallHistoryResponse = {
  calls: ContactCallHistoryItem[];
};

export type RepDailyCallCountResponse = {
  date: string;
  count: number;
};

export type LeadSummary = {
  id: string;
  stage: string;
  source: string;
};

export type PromoteCallResponse = {
  lead: LeadSummary;
  created: boolean;
};

export type CreateContactApiResult =
  | { status: "ok"; contact: ContactSummary }
  | { status: "duplicate"; contact: ContactSummary }
  | { status: "error"; message: string };

export type CreateCallApiResult =
  | { status: "ok"; call: CallLogSummary }
  | { status: "error"; message: string };

export type PromoteCallApiResult =
  | { status: "ok"; lead: LeadSummary; created: boolean }
  | { status: "error"; message: string };
