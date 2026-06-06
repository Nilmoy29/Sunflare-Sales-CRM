-- Story 4.1: hardened leads RLS + lead_activity + follow_ups RLS

create trigger leads_set_updated_at
  before update on public.leads
  for each row
  execute function public.set_updated_at();

create policy leads_update_rep on public.leads
  for update
  to authenticated
  using (rep_id = auth.uid())
  with check (rep_id = auth.uid());

create policy leads_update_admin on public.leads
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update on public.leads to authenticated;

alter table public.lead_activity enable row level security;

create policy lead_activity_select_rep on public.lead_activity
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.leads l
      where l.id = lead_id
        and l.rep_id = auth.uid()
    )
  );

create policy lead_activity_insert_rep on public.lead_activity
  for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and exists (
      select 1
      from public.leads l
      where l.id = lead_id
        and l.rep_id = auth.uid()
    )
  );

create policy lead_activity_select_admin on public.lead_activity
  for select
  to authenticated
  using (public.is_admin());

create policy lead_activity_insert_admin on public.lead_activity
  for insert
  to authenticated
  with check (public.is_admin());

grant select, insert on public.lead_activity to authenticated;

alter table public.follow_ups enable row level security;

create policy follow_ups_select_rep on public.follow_ups
  for select
  to authenticated
  using (rep_id = auth.uid());

create policy follow_ups_insert_rep on public.follow_ups
  for insert
  to authenticated
  with check (
    rep_id = auth.uid()
    and exists (
      select 1
      from public.leads l
      where l.id = lead_id
        and l.rep_id = auth.uid()
    )
  );

create policy follow_ups_update_rep on public.follow_ups
  for update
  to authenticated
  using (rep_id = auth.uid())
  with check (
    rep_id = auth.uid()
    and exists (
      select 1
      from public.leads l
      where l.id = lead_id
        and l.rep_id = auth.uid()
    )
  );

create policy follow_ups_select_admin on public.follow_ups
  for select
  to authenticated
  using (public.is_admin());

create policy follow_ups_insert_admin on public.follow_ups
  for insert
  to authenticated
  with check (public.is_admin());

create policy follow_ups_update_admin on public.follow_ups
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.follow_ups to authenticated;
