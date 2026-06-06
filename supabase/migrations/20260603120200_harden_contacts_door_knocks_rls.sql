-- Story 2.1 code review: contact ownership on knock insert, created_by immutability, RLS initplan

-- Patch 1 & 3: recreate rep-scoped policies with (select auth.uid()) and contact ownership on knock insert
drop policy if exists contacts_select_rep on public.contacts;
drop policy if exists contacts_insert_rep on public.contacts;
drop policy if exists contacts_update_rep on public.contacts;
drop policy if exists door_knocks_select_rep on public.door_knocks;
drop policy if exists door_knocks_insert_rep on public.door_knocks;

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
  );

create policy contacts_insert_rep on public.contacts
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

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
  )
  with check (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.door_knocks dk
      where dk.contact_id = contacts.id
        and dk.rep_id = (select auth.uid())
    )
  );

create policy door_knocks_select_rep on public.door_knocks
  for select
  to authenticated
  using (rep_id = (select auth.uid()));

create policy door_knocks_insert_rep on public.door_knocks
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
        )
    )
  );

-- Patch 2: prevent reps from reassigning contacts.created_by
create or replace function public.enforce_contact_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.created_by is distinct from old.created_by then
      raise exception 'Only admins may change contact created_by'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_contact_created_by() from public;
revoke all on function public.enforce_contact_created_by() from anon, authenticated;

create trigger contacts_created_by_guardrails
  before update on public.contacts
  for each row
  execute function public.enforce_contact_created_by();
