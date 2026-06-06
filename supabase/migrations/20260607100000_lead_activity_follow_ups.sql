-- Story 4.1: lead_activity + follow_ups tables (PRD Section 5)

create table public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete restrict,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  type public.lead_activity_type not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

create index idx_lead_activity_lead_created
  on public.lead_activity (lead_id, created_at desc);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete restrict,
  rep_id uuid not null references public.profiles (id) on delete restrict,
  due_at timestamptz not null,
  note text not null default '',
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_follow_ups_rep_due
  on public.follow_ups (rep_id, due_at);

create index idx_follow_ups_lead_id
  on public.follow_ups (lead_id);
