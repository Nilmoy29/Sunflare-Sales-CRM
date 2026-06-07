-- Story 5.6: wire call_logs counts into admin daily rep summary RPC

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
    select rep_id, count(*)::bigint as leads_added
    from public.leads
    where created_at >= p_from and created_at <= p_to
    group by rep_id
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

revoke all on function public.get_admin_daily_rep_summary(
  timestamptz,
  timestamptz
) from public;

grant execute on function public.get_admin_daily_rep_summary(
  timestamptz,
  timestamptz
) to authenticated;
