-- Story 7.4: rep deep-dive activity trend + pipeline snapshot RPCs

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
      (created_at at time zone 'Australia/Sydney')::date as activity_date,
      count(*)::bigint as leads_added
    from public.leads
    where rep_id = p_rep_id
      and created_at >= p_from
      and created_at <= p_to
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

create or replace function public.get_admin_rep_pipeline_snapshot(
  p_rep_id uuid
)
returns table (
  stage_key text,
  label text,
  sort_order int,
  count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with stages as (
    select *
    from (
      values
        ('knocked_called', 'Knocked / Called', 1),
        ('interested', 'Interested', 2),
        ('appointment_set', 'Appointment set', 3),
        ('pitched', 'Pitched', 4),
        ('proposal_sent', 'Proposal sent', 5),
        ('signed', 'Signed', 6)
    ) as t(stage_key, label, sort_order)
  ),
  counts as (
    select stage, count(*)::bigint as cnt
    from public.leads
    where rep_id = p_rep_id
      and stage != 'lost'
    group by stage
  )
  select
    s.stage_key,
    s.label,
    s.sort_order,
    coalesce(c.cnt, 0)::bigint as count
  from stages s
  left join counts c on c.stage::text = s.stage_key
  order by s.sort_order asc;
$$;

revoke all on function public.get_admin_rep_activity_trend(uuid, timestamptz, timestamptz) from public;
revoke all on function public.get_admin_rep_pipeline_snapshot(uuid) from public;

grant execute on function public.get_admin_rep_activity_trend(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_admin_rep_pipeline_snapshot(uuid) to authenticated;
