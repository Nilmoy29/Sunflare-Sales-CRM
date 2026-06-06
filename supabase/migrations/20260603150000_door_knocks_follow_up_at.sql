-- Story 2.5: optional follow-up on door knocks (FR57)

alter table public.door_knocks
  add column if not exists follow_up_at timestamptz null;

comment on column public.door_knocks.follow_up_at is
  'Optional rep follow-up reminder for this knock (FR57).';
