-- Rep-owned activity logs: update and delete with lead-link guards

create policy door_knocks_update_rep on public.door_knocks
  for update
  to authenticated
  using (rep_id = (select auth.uid()))
  with check (rep_id = (select auth.uid()));

create policy door_knocks_delete_rep on public.door_knocks
  for delete
  to authenticated
  using (rep_id = (select auth.uid()));

create policy call_logs_update_rep on public.call_logs
  for update
  to authenticated
  using (rep_id = (select auth.uid()))
  with check (rep_id = (select auth.uid()));

create policy call_logs_delete_rep on public.call_logs
  for delete
  to authenticated
  using (rep_id = (select auth.uid()));

grant update, delete on public.door_knocks to authenticated;
grant update, delete on public.call_logs to authenticated;

create or replace function public.update_door_knock(
  p_id uuid,
  p_outcome public.door_outcome,
  p_notes text,
  p_follow_up_at timestamptz
)
returns table (
  id uuid,
  outcome public.door_outcome,
  knocked_at timestamptz,
  lat double precision,
  lng double precision,
  notes text,
  follow_up_at timestamptz,
  has_linked_lead boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_has_lead boolean;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.leads l
    where l.door_knock_id = p_id
  )
  into v_has_lead;

  if v_has_lead and p_outcome is distinct from (
    select dk.outcome from public.door_knocks dk where dk.id = p_id
  ) and p_outcome <> 'interested' then
    raise exception 'Cannot change outcome while a lead is linked to this knock'
      using errcode = '23514';
  end if;

  return query
  update public.door_knocks dk
  set
    outcome = p_outcome,
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    follow_up_at = p_follow_up_at
  where dk.id = p_id
    and dk.rep_id = v_rep_id
  returning
    dk.id,
    dk.outcome,
    dk.knocked_at,
    dk.lat,
    dk.lng,
    dk.notes,
    dk.follow_up_at,
    v_has_lead;
end;
$$;

create or replace function public.delete_door_knock(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.leads l
    where l.door_knock_id = p_id
  ) then
    raise exception 'Cannot delete a knock linked to a pipeline lead'
      using errcode = '23514';
  end if;

  delete from public.door_knocks dk
  where dk.id = p_id
    and dk.rep_id = v_rep_id;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    raise exception 'Knock not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.update_call_log(
  p_id uuid,
  p_outcome public.call_outcome,
  p_duration_seconds integer,
  p_notes text,
  p_follow_up_at timestamptz
)
returns table (
  id uuid,
  contact_id uuid,
  rep_id uuid,
  outcome public.call_outcome,
  duration_seconds integer,
  notes text,
  called_at timestamptz,
  follow_up_at timestamptz,
  has_linked_lead boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_has_lead boolean;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.leads l
    where l.call_log_id = p_id
  )
  into v_has_lead;

  if v_has_lead and p_outcome is distinct from (
    select cl.outcome from public.call_logs cl where cl.id = p_id
  ) and p_outcome <> 'answered_interested' then
    raise exception 'Cannot change outcome while a lead is linked to this call'
      using errcode = '23514';
  end if;

  return query
  update public.call_logs cl
  set
    outcome = p_outcome,
    duration_seconds = p_duration_seconds,
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    follow_up_at = p_follow_up_at
  where cl.id = p_id
    and cl.rep_id = v_rep_id
  returning
    cl.id,
    cl.contact_id,
    cl.rep_id,
    cl.outcome,
    cl.duration_seconds,
    cl.notes,
    cl.called_at,
    cl.follow_up_at,
    v_has_lead;
end;
$$;

create or replace function public.delete_call_log(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.leads l
    where l.call_log_id = p_id
  ) then
    raise exception 'Cannot delete a call linked to a pipeline lead'
      using errcode = '23514';
  end if;

  delete from public.call_logs cl
  where cl.id = p_id
    and cl.rep_id = v_rep_id;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    raise exception 'Call log not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.update_door_knock(uuid, public.door_outcome, text, timestamptz) from public;
revoke all on function public.delete_door_knock(uuid) from public;
revoke all on function public.update_call_log(uuid, public.call_outcome, integer, text, timestamptz) from public;
revoke all on function public.delete_call_log(uuid) from public;

grant execute on function public.update_door_knock(uuid, public.door_outcome, text, timestamptz) to authenticated;
grant execute on function public.delete_door_knock(uuid) to authenticated;
grant execute on function public.update_call_log(uuid, public.call_outcome, integer, text, timestamptz) to authenticated;
grant execute on function public.delete_call_log(uuid) to authenticated;
