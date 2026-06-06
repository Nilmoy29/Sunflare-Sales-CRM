-- Story 2.1: RLS for contacts + door_knocks (uses public.is_admin() from Story 1.3)

alter table public.contacts enable row level security;
alter table public.door_knocks enable row level security;

create policy contacts_select_rep on public.contacts
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.door_knocks dk
      where dk.contact_id = contacts.id
        and dk.rep_id = auth.uid()
    )
  );

create policy contacts_insert_rep on public.contacts
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy contacts_update_rep on public.contacts
  for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.door_knocks dk
      where dk.contact_id = contacts.id
        and dk.rep_id = auth.uid()
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1
      from public.door_knocks dk
      where dk.contact_id = contacts.id
        and dk.rep_id = auth.uid()
    )
  );

create policy contacts_select_admin on public.contacts
  for select
  to authenticated
  using (public.is_admin());

create policy door_knocks_select_rep on public.door_knocks
  for select
  to authenticated
  using (rep_id = auth.uid());

create policy door_knocks_insert_rep on public.door_knocks
  for insert
  to authenticated
  with check (rep_id = auth.uid());

create policy door_knocks_select_admin on public.door_knocks
  for select
  to authenticated
  using (public.is_admin());

grant select, insert, update on public.contacts to authenticated;
grant select, insert on public.door_knocks to authenticated;
