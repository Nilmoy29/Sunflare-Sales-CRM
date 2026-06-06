-- Story 5.1: call_logs table + leads.call_log_id FK

create table public.call_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete restrict,
  rep_id uuid not null references public.profiles (id) on delete restrict,
  outcome public.call_outcome not null,
  duration_seconds integer,
  notes text,
  called_at timestamptz not null default now(),
  follow_up_at timestamptz
);

create index idx_call_logs_rep_id on public.call_logs (rep_id);
create index idx_call_logs_contact_id on public.call_logs (contact_id);
create index idx_call_logs_called_at on public.call_logs (called_at desc);
create index idx_call_logs_rep_called_at on public.call_logs (rep_id, called_at desc);

alter table public.leads
  add constraint leads_call_log_id_fkey
  foreign key (call_log_id) references public.call_logs (id) on delete set null;

create unique index idx_leads_call_log_id
  on public.leads (call_log_id)
  where call_log_id is not null;

-- Story 3.2 extension: Realtime INSERT events for admin activity feed
do $$
begin
  alter publication supabase_realtime add table public.call_logs;
exception
  when duplicate_object then null;
end $$;
