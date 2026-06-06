-- Story 2.2: RLS for shifts + gps_pings (uses public.is_admin() from Story 1.3)

alter table public.shifts enable row level security;
alter table public.gps_pings enable row level security;

create policy shifts_select_rep on public.shifts
  for select
  to authenticated
  using (rep_id = (select auth.uid()));

create policy shifts_insert_rep on public.shifts
  for insert
  to authenticated
  with check (rep_id = (select auth.uid()));

create policy shifts_update_rep on public.shifts
  for update
  to authenticated
  using (rep_id = (select auth.uid()))
  with check (rep_id = (select auth.uid()));

create policy shifts_select_admin on public.shifts
  for select
  to authenticated
  using (public.is_admin());

create policy gps_pings_select_rep on public.gps_pings
  for select
  to authenticated
  using (rep_id = (select auth.uid()));

create policy gps_pings_insert_rep on public.gps_pings
  for insert
  to authenticated
  with check (
    rep_id = (select auth.uid())
    and exists (
      select 1
      from public.shifts s
      where s.id = shift_id
        and s.rep_id = (select auth.uid())
        and s.ended_at is null
    )
  );

create policy gps_pings_select_admin on public.gps_pings
  for select
  to authenticated
  using (public.is_admin());

grant select, insert, update on public.shifts to authenticated;
grant select, insert on public.gps_pings to authenticated;
