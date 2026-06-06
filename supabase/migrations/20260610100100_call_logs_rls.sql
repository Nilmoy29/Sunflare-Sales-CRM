-- Story 5.1: call_logs RLS + contacts policy extension for call linkage

alter table public.call_logs enable row level security;

create policy call_logs_select_rep on public.call_logs
  for select
  to authenticated
  using (rep_id = (select auth.uid()));

create policy call_logs_insert_rep on public.call_logs
  for insert
  to authenticated
  with check (
    rep_id = (select auth.uid())
    and exists (
      select 1
      from public.contacts c
      where c.id = contact_id
        and (
          c.created_by = (select auth.uid())
          or exists (
            select 1
            from public.door_knocks dk
            where dk.contact_id = c.id
              and dk.rep_id = (select auth.uid())
          )
          or exists (
            select 1
            from public.call_logs cl
            where cl.contact_id = c.id
              and cl.rep_id = (select auth.uid())
          )
        )
    )
  );

create policy call_logs_select_admin on public.call_logs
  for select
  to authenticated
  using (public.is_admin());

grant select, insert on public.call_logs to authenticated;

-- Extend contacts RLS: reps read/update contacts linked via their calls
drop policy if exists contacts_select_rep on public.contacts;
drop policy if exists contacts_update_rep on public.contacts;

create policy contacts_select_rep on public.contacts
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.door_knocks dk
      where dk.contact_id = contacts.id
        and dk.rep_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.call_logs cl
      where cl.contact_id = contacts.id
        and cl.rep_id = (select auth.uid())
    )
  );

create policy contacts_update_rep on public.contacts
  for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.door_knocks dk
      where dk.contact_id = contacts.id
        and dk.rep_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.call_logs cl
      where cl.contact_id = contacts.id
        and cl.rep_id = (select auth.uid())
    )
  )
  with check (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.door_knocks dk
      where dk.contact_id = contacts.id
        and dk.rep_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.call_logs cl
      where cl.contact_id = contacts.id
        and cl.rep_id = (select auth.uid())
    )
  );
