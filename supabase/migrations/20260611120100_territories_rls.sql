-- Story 6.1: RLS for territories + territory_assignments (FR60, NFR9, NFR10)

alter table public.territories enable row level security;
alter table public.territory_assignments enable row level security;

create policy territories_admin on public.territories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy territory_assignments_admin on public.territory_assignments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy territory_assignments_select_rep on public.territory_assignments
  for select
  to authenticated
  using (rep_id = (select auth.uid()));

create policy territories_select_rep on public.territories
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.territory_assignments ta
      where ta.territory_id = territories.id
        and ta.rep_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.territories to authenticated;
grant select, insert, update, delete on public.territory_assignments to authenticated;
