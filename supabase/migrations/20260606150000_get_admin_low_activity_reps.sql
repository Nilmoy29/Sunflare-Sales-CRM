-- Story 3.4: low-activity rep detection for admin dashboard coaching panel

create or replace function public.get_admin_low_activity_reps(
  p_window_minutes int default 60
)
returns table (
  rep_id uuid,
  rep_name text,
  shift_id uuid,
  shift_started_at timestamptz,
  last_activity_at timestamptz,
  idle_minutes int
)
language sql
stable
security invoker
set search_path = public
as $$
  with active_shifts as (
    select s.id as shift_id, s.rep_id, s.started_at as shift_started_at
    from public.shifts s
    where s.ended_at is null
  ),
  last_knock as (
    select a.rep_id, max(dk.knocked_at) as last_activity_at
    from active_shifts a
    left join public.door_knocks dk
      on dk.rep_id = a.rep_id
      and dk.knocked_at >= a.shift_started_at
    group by a.rep_id
  )
  select
    a.rep_id,
    p.name as rep_name,
    a.shift_id,
    a.shift_started_at,
    lk.last_activity_at,
    floor(
      extract(epoch from (now() - coalesce(lk.last_activity_at, a.shift_started_at))) / 60
    )::int as idle_minutes
  from active_shifts a
  join public.profiles p on p.id = a.rep_id
  left join last_knock lk on lk.rep_id = a.rep_id
  where floor(
    extract(epoch from (now() - coalesce(lk.last_activity_at, a.shift_started_at))) / 60
  ) >= p_window_minutes
  order by idle_minutes desc;
$$;

revoke all on function public.get_admin_low_activity_reps(int) from public;

grant execute on function public.get_admin_low_activity_reps(int) to authenticated;
