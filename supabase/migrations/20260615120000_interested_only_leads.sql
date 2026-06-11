-- Only interested knock/call outcomes create and count as leads (not callbacks).

create or replace function public.create_knock_with_contact(
  p_lat double precision,
  p_lng double precision,
  p_outcome public.door_outcome,
  p_notes text,
  p_follow_up_at timestamptz,
  p_address text,
  p_suburb text,
  p_postcode text,
  p_idempotency_key text
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  outcome public.door_outcome,
  knocked_at timestamptz,
  was_duplicate boolean,
  lead_id uuid,
  lead_created boolean
)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  v_rep_id uuid := auth.uid();
  v_contact_id uuid;
  v_knock_id uuid;
  v_knocked_at timestamptz;
  v_existing record;
  v_lead_id uuid;
  v_lead_created boolean := false;
  v_promotable boolean;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_promotable := p_outcome = 'interested';

  if p_idempotency_key is not null then
    select
      dk.id,
      dk.lat,
      dk.lng,
      dk.outcome,
      dk.knocked_at
    into v_existing
    from public.door_knocks dk
    where dk.rep_id = v_rep_id
      and dk.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      v_lead_id := null;
      v_lead_created := false;

      if v_existing.outcome = 'interested' then
        select l.id
        into v_lead_id
        from public.leads l
        where l.door_knock_id = v_existing.id
        limit 1;
      end if;

      return query
      select
        v_existing.id,
        v_existing.lat,
        v_existing.lng,
        v_existing.outcome,
        v_existing.knocked_at,
        true,
        v_lead_id,
        v_lead_created;
      return;
    end if;
  end if;

  insert into public.contacts (
    lat,
    lng,
    address,
    suburb,
    postcode,
    created_by
  )
  values (
    p_lat,
    p_lng,
    p_address,
    p_suburb,
    p_postcode,
    v_rep_id
  )
  returning contacts.id into v_contact_id;

  insert into public.door_knocks (
    contact_id,
    rep_id,
    outcome,
    notes,
    lat,
    lng,
    follow_up_at,
    synced,
    idempotency_key
  )
  values (
    v_contact_id,
    v_rep_id,
    p_outcome,
    p_notes,
    p_lat,
    p_lng,
    p_follow_up_at,
    true,
    p_idempotency_key
  )
  returning
    door_knocks.id,
    door_knocks.knocked_at
  into v_knock_id, v_knocked_at;

  if v_promotable then
    insert into public.leads (
      contact_id,
      rep_id,
      source,
      stage,
      door_knock_id
    )
    values (
      v_contact_id,
      v_rep_id,
      'd2d',
      'interested',
      v_knock_id
    )
    on conflict (door_knock_id) where door_knock_id is not null do nothing
    returning leads.id into v_lead_id;

    if v_lead_id is not null then
      v_lead_created := true;
    else
      select l.id
      into v_lead_id
      from public.leads l
      where l.door_knock_id = v_knock_id
      limit 1;
    end if;
  end if;

  return query
  select
    v_knock_id,
    p_lat,
    p_lng,
    p_outcome,
    v_knocked_at,
    false,
    v_lead_id,
    v_lead_created;
end;
$$;

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

  if v_call.outcome != 'answered_interested' then
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

create or replace function public.get_admin_daily_rep_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  rep_id uuid,
  rep_name text,
  doors bigint,
  calls bigint,
  leads_added bigint,
  appointments_set bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with reps as (
    select id, name
    from public.profiles
    where role = 'rep'
  ),
  door_counts as (
    select rep_id, count(*)::bigint as doors
    from public.door_knocks
    where knocked_at >= p_from and knocked_at <= p_to
    group by rep_id
  ),
  call_counts as (
    select rep_id, count(*)::bigint as calls
    from public.call_logs
    where called_at >= p_from and called_at <= p_to
    group by rep_id
  ),
  lead_counts as (
    select l.rep_id, count(*)::bigint as leads_added
    from public.leads l
    left join public.door_knocks dk on dk.id = l.door_knock_id
    left join public.call_logs cl on cl.id = l.call_log_id
    where l.created_at >= p_from
      and l.created_at <= p_to
      and (
        (l.door_knock_id is not null and dk.outcome = 'interested')
        or (l.call_log_id is not null and cl.outcome = 'answered_interested')
      )
    group by l.rep_id
  ),
  appointment_counts as (
    select rep_id, count(*)::bigint as appointments_set
    from public.leads
    where stage = 'appointment_set'
      and updated_at >= p_from
      and updated_at <= p_to
      and updated_at > created_at
    group by rep_id
  )
  select
    r.id as rep_id,
    r.name as rep_name,
    coalesce(d.doors, 0) as doors,
    coalesce(c.calls, 0) as calls,
    coalesce(l.leads_added, 0) as leads_added,
    coalesce(a.appointments_set, 0) as appointments_set
  from reps r
  left join door_counts d on d.rep_id = r.id
  left join call_counts c on c.rep_id = r.id
  left join lead_counts l on l.rep_id = r.id
  left join appointment_counts a on a.rep_id = r.id
  order by r.name asc;
$$;

create or replace function public.get_admin_rep_activity_trend(
  p_rep_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  activity_date date,
  doors bigint,
  calls bigint,
  leads_added bigint,
  appointments_set bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      (p_from at time zone 'Australia/Sydney')::date as start_date,
      (p_to at time zone 'Australia/Sydney')::date as end_date
  ),
  days as (
    select generate_series(b.start_date, b.end_date, interval '1 day')::date as activity_date
    from bounds b
  ),
  door_counts as (
    select
      (knocked_at at time zone 'Australia/Sydney')::date as activity_date,
      count(*)::bigint as doors
    from public.door_knocks
    where rep_id = p_rep_id
      and knocked_at >= p_from
      and knocked_at <= p_to
    group by 1
  ),
  call_counts as (
    select
      (called_at at time zone 'Australia/Sydney')::date as activity_date,
      count(*)::bigint as calls
    from public.call_logs
    where rep_id = p_rep_id
      and called_at >= p_from
      and called_at <= p_to
    group by 1
  ),
  lead_counts as (
    select
      (l.created_at at time zone 'Australia/Sydney')::date as activity_date,
      count(*)::bigint as leads_added
    from public.leads l
    left join public.door_knocks dk on dk.id = l.door_knock_id
    left join public.call_logs cl on cl.id = l.call_log_id
    where l.rep_id = p_rep_id
      and l.created_at >= p_from
      and l.created_at <= p_to
      and (
        (l.door_knock_id is not null and dk.outcome = 'interested')
        or (l.call_log_id is not null and cl.outcome = 'answered_interested')
      )
    group by 1
  ),
  appointment_counts as (
    select
      (updated_at at time zone 'Australia/Sydney')::date as activity_date,
      count(*)::bigint as appointments_set
    from public.leads
    where rep_id = p_rep_id
      and stage = 'appointment_set'
      and updated_at >= p_from
      and updated_at <= p_to
      and updated_at > created_at
    group by 1
  )
  select
    d.activity_date,
    coalesce(dc.doors, 0) as doors,
    coalesce(cc.calls, 0) as calls,
    coalesce(lc.leads_added, 0) as leads_added,
    coalesce(ac.appointments_set, 0) as appointments_set
  from days d
  left join door_counts dc on dc.activity_date = d.activity_date
  left join call_counts cc on cc.activity_date = d.activity_date
  left join lead_counts lc on lc.activity_date = d.activity_date
  left join appointment_counts ac on ac.activity_date = d.activity_date
  order by d.activity_date asc;
$$;

create or replace function public.get_admin_geographic_yield(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  suburb text,
  doors bigint,
  interested bigint,
  leads_added bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with knock_stats as (
    select
      lower(trim(c.suburb)) as suburb_key,
      max(trim(c.suburb)) as suburb,
      count(*)::bigint as doors,
      count(*) filter (where dk.outcome = 'interested')::bigint as interested
    from public.door_knocks dk
    join public.contacts c on c.id = dk.contact_id
    where dk.knocked_at >= p_from
      and dk.knocked_at <= p_to
      and trim(coalesce(c.suburb, '')) <> ''
    group by 1
  ),
  lead_stats as (
    select
      lower(trim(c.suburb)) as suburb_key,
      max(trim(c.suburb)) as suburb,
      count(*)::bigint as leads_added
    from public.leads l
    join public.contacts c on c.id = l.contact_id
    left join public.door_knocks dk on dk.id = l.door_knock_id
    left join public.call_logs cl on cl.id = l.call_log_id
    where l.created_at >= p_from
      and l.created_at <= p_to
      and trim(coalesce(c.suburb, '')) <> ''
      and (
        (l.door_knock_id is not null and dk.outcome = 'interested')
        or (l.call_log_id is not null and cl.outcome = 'answered_interested')
      )
    group by 1
  )
  select
    coalesce(k.suburb, l.suburb) as suburb,
    coalesce(k.doors, 0)::bigint as doors,
    coalesce(k.interested, 0)::bigint as interested,
    coalesce(l.leads_added, 0)::bigint as leads_added
  from knock_stats k
  full outer join lead_stats l on l.suburb_key = k.suburb_key
  order by coalesce(k.suburb, l.suburb) asc;
$$;

create or replace function public.count_rep_interested_leads(
  p_rep_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::bigint
  from public.leads l
  left join public.door_knocks dk on dk.id = l.door_knock_id
  left join public.call_logs cl on cl.id = l.call_log_id
  where l.rep_id = p_rep_id
    and l.created_at >= p_from
    and l.created_at <= p_to
    and (
      (l.door_knock_id is not null and dk.outcome = 'interested')
      or (l.call_log_id is not null and cl.outcome = 'answered_interested')
    );
$$;

revoke all on function public.count_rep_interested_leads(
  uuid,
  timestamptz,
  timestamptz
) from public;

grant execute on function public.count_rep_interested_leads(
  uuid,
  timestamptz,
  timestamptz
) to authenticated;
