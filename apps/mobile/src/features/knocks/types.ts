import type { CreateKnockBody, DoorOutcome, SyncKnockItem } from "@sunflare/shared";

export type KnockPin = {
  id: string;
  lat: number;
  lng: number;
  outcome: DoorOutcome;
  knocked_at: string;
};

export type PendingKnockPin = KnockPin & {
  pending: true;
};

export type KnockDraft = {
  lat: number;
  lng: number;
  source: "map_tap" | "gps_quick_add";
};

export type LeadSummary = {
  id: string;
  stage: string;
  source: string;
};

export type CreateKnockResponse = {
  knock: KnockPin;
  lead?: LeadSummary;
};

export type SyncKnockResult = {
  client_id: string;
  status: "created" | "duplicate";
  knock: KnockPin;
  lead?: LeadSummary;
};

export type PriorKnock = {
  id: string;
  outcome: DoorOutcome;
  knocked_at: string;
  rep_id: string;
  rep_name: string;
  is_own: boolean;
};

export type DuplicateAlert = {
  rep_name: string;
  knocked_at: string;
  outcome: DoorOutcome;
};

export type KnocksNearResponse = {
  priorKnocks: PriorKnock[];
  duplicateAlert: DuplicateAlert | null;
};

export type KnocksInBboxResponse = {
  knocks: KnockPin[];
  truncated: boolean;
};

export type ReverseGeocodeResult = {
  address: string | null;
  suburb: string | null;
  postcode: string | null;
};

export type SubmitKnockResult =
  | { mode: "online"; knock: KnockPin; lead?: LeadSummary }
  | { mode: "offline"; pending: PendingKnockPin };

export type { CreateKnockBody, SyncKnockItem };
