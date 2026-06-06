-- Story 2.9: minimal leads table for D2D promotion

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete restrict,
  rep_id uuid not null references public.profiles(id) on delete restrict,
  source public.lead_source not null,
  stage public.lead_stage not null default 'interested',
  door_knock_id uuid references public.door_knocks(id) on delete set null,
  call_log_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_rep_id on public.leads (rep_id);

create unique index idx_leads_door_knock_id
  on public.leads (door_knock_id)
  where door_knock_id is not null;
