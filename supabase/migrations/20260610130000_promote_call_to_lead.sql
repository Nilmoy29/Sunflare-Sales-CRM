-- Story 5.4: promote call log to pipeline lead (mirror 2.9 knock promotion)

create or replace function public.promote_call_to_lead(p_call_log_id uuid)
returns table (
  lead_id uuid,
  lead_created boolean,
  contact_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_call record;
  v_lead_id uuid;
  v_lead_created boolean := false;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select cl.id, cl.contact_id, cl.rep_id, cl.outcome
  into v_call
  from public.call_logs cl
  where cl.id = p_call_log_id
    and cl.rep_id = v_rep_id;

  if not found then
    raise exception 'Call log not found' using errcode = 'P0002';
  end if;

  if v_call.outcome not in ('answered_interested', 'callback_scheduled') then
    raise exception 'Call outcome is not promotable' using errcode = '22023';
  end if;

  insert into public.leads (
    contact_id,
    rep_id,
    source,
    stage,
    call_log_id
  )
  values (
    v_call.contact_id,
    v_rep_id,
    'call',
    'interested',
    p_call_log_id
  )
  on conflict (call_log_id) where call_log_id is not null do nothing
  returning leads.id into v_lead_id;

  if v_lead_id is not null then
    v_lead_created := true;
  else
    select l.id
    into v_lead_id
    from public.leads l
    where l.call_log_id = p_call_log_id
    limit 1;
  end if;

  return query
  select v_lead_id, v_lead_created, v_call.contact_id;
end;
$$;

revoke all on function public.promote_call_to_lead(uuid) from public;

grant execute on function public.promote_call_to_lead(uuid) to authenticated;
