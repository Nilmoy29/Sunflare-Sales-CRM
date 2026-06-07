-- Story 7.2: funnel conversion counts for admin dashboard

create or replace function public.get_admin_funnel_conversion(
  p_from timestamptz,
  p_to timestamptz
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
  with base_leads as (
    select stage
    from public.leads
    where created_at >= p_from
      and created_at <= p_to
      and stage != 'lost'
  ),
  counts as (
    select
      count(*)::bigint as interacted,
      count(*) filter (
        where stage in (
          'interested',
          'appointment_set',
          'pitched',
          'proposal_sent',
          'signed'
        )
      )::bigint as interested,
      count(*) filter (
        where stage in (
          'appointment_set',
          'pitched',
          'proposal_sent',
          'signed'
        )
      )::bigint as appointment_set,
      count(*) filter (
        where stage in ('pitched', 'proposal_sent', 'signed')
      )::bigint as pitched,
      count(*) filter (where stage = 'signed')::bigint as closed_won
    from base_leads
  )
  select 'interacted'::text, 'Interacted'::text, 1, interacted
  from counts
  union all
  select 'interested', 'Interested', 2, interested
  from counts
  union all
  select 'appointment_set', 'Appt Set', 3, appointment_set
  from counts
  union all
  select 'pitched', 'Pitched', 4, pitched
  from counts
  union all
  select 'closed_won', 'Closed-Won', 5, closed_won
  from counts
  order by 3;
$$;

revoke all on function public.get_admin_funnel_conversion(
  timestamptz,
  timestamptz
) from public;

grant execute on function public.get_admin_funnel_conversion(
  timestamptz,
  timestamptz
) to authenticated;
