-- Story 2.9: RLS for leads (minimal — full governance in Story 4.1)

alter table public.leads enable row level security;

create policy leads_select_rep on public.leads
  for select
  to authenticated
  using (rep_id = auth.uid());

create policy leads_insert_rep on public.leads
  for insert
  to authenticated
  with check (rep_id = auth.uid());

create policy leads_select_admin on public.leads
  for select
  to authenticated
  using (public.is_admin());

grant select, insert on public.leads to authenticated;
