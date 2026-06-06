-- FROZEN — PRD v1 enum set. Require a new migration to change values after go-live.

create type public.user_role as enum ('admin', 'rep');

create type public.door_outcome as enum (
  'interested',
  'not_home',
  'not_interested',
  'do_not_knock',
  'callback_requested',
  'already_has_solar'
);

create type public.call_outcome as enum (
  'answered_interested',
  'answered_not_interested',
  'voicemail',
  'no_answer',
  'wrong_number',
  'callback_scheduled'
);

create type public.lead_source as enum ('d2d', 'call');

create type public.lead_stage as enum (
  'knocked_called',
  'interested',
  'appointment_set',
  'pitched',
  'proposal_sent',
  'signed',
  'lost'
);

create type public.lead_activity_type as enum (
  'note',
  'stage_change',
  'call',
  'knock'
);

create type public.lost_reason as enum (
  'price',
  'not_interested',
  'competitor',
  'no_response'
);
