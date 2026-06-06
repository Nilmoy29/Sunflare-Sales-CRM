alter table public.leads
  add column if not exists lost_reason public.lost_reason null;
