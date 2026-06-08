-- Fix infinite recursion: door_knocks INSERT policy must not query door_knocks under RLS.

create or replace function public.rep_can_knock_contact(p_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.contacts c
    where c.id = p_contact_id
      and (
        c.created_by = auth.uid()
        or exists (
          select 1
          from public.door_knocks dk
          where dk.contact_id = c.id
            and dk.rep_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.rep_can_knock_contact(uuid) from public;
grant execute on function public.rep_can_knock_contact(uuid) to authenticated;

drop policy if exists door_knocks_insert_rep on public.door_knocks;

create policy door_knocks_insert_rep on public.door_knocks
  for insert
  to authenticated
  with check (
    rep_id = (select auth.uid())
    and public.rep_can_knock_contact(contact_id)
  );
