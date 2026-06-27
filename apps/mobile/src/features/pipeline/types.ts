import type {
  LeadSource,
  LeadStage,
  LostReason,
} from "@sunflare/shared";

export type PipelineLeadCard = {
  id: string;
  stage: LeadStage;
  source: LeadSource;
  rep_id: string;
  rep_name: string;
  contact_name: string;
  phone: string | null;
  address: string | null;
  suburb: string | null;
  updated_at: string;
  last_touch_at: string;
  next_action_due_at: string | null;
  booked_at: string | null;
  closer_name: string | null;
  booking_notes: string | null;
  proposal_sent_at: string | null;
  latest_note: string | null;
};

export type PipelineFilters = {
  stages: LeadStage[] | null;
  repIds: string[] | null;
  sources: LeadSource[] | null;
  suburb: string;
  from: string;
  to: string;
};

export type PipelineLeadsResponse = {
  leads: PipelineLeadCard[];
};

export type UpdateLeadStageResponse = {
  lead: PipelineLeadCard;
};

export type LeadDetailHeader = {
  id: string;
  contact_id: string;
  stage: LeadStage;
  source: LeadSource;
  rep_id: string;
  rep_name: string;
  contact_name: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
  phone: string | null;
  booked_at: string | null;
  closer_name: string | null;
  booking_notes: string | null;
  created_at: string;
  lost_reason: LostReason | null;
};

export type LeadDetailTimelineItem =
  | {
      kind: "knock";
      id: string;
      occurred_at: string;
      rep_name: string;
      outcome: string;
      address: string | null;
      suburb: string | null;
      is_origin: boolean;
    }
  | {
      kind: "call";
      id: string;
      occurred_at: string;
      rep_name: string;
      outcome: string;
      notes: string | null;
      duration_seconds: number | null;
    }
  | {
      kind: "note";
      id: string;
      occurred_at: string;
      rep_name: string;
      content: string;
    }
  | {
      kind: "stage_change";
      id: string;
      occurred_at: string;
      rep_name: string;
      from_stage?: LeadStage;
      to_stage?: LeadStage;
      content: string;
    }
  | {
      kind: "follow_up";
      id: string;
      occurred_at: string;
      rep_name: string;
      due_at: string;
      note: string;
      completed: boolean;
    };

export type LeadDetailResponse = {
  lead: LeadDetailHeader;
  calls_available: boolean;
  timeline: LeadDetailTimelineItem[];
};

export type CreateFollowUpBody = {
  due_at: string;
  note?: string;
};

export type CreateFollowUpResponse = {
  follow_up: Extract<LeadDetailTimelineItem, { kind: "follow_up" }>;
};
