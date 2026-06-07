-- Story 7.5: geographic yield by suburb for admin dashboard

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
    where l.created_at >= p_from
      and l.created_at <= p_to
      and trim(coalesce(c.suburb, '')) <> ''
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

revoke all on function public.get_admin_geographic_yield(timestamptz, timestamptz) from public;

grant execute on function public.get_admin_geographic_yield(timestamptz, timestamptz) to authenticated;
