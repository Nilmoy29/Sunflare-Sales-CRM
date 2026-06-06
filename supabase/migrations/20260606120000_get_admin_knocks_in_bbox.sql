-- Story 3.1: viewport-limited knock pins for admin global map

create or replace function public.get_admin_knocks_in_bbox(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_rep_ids uuid[] default null,
  p_outcomes public.door_outcome[] default null
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  outcome public.door_outcome,
  knocked_at timestamptz,
  rep_id uuid,
  rep_name text,
  address text,
  suburb text,
  postcode text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    dk.id,
    dk.lat,
    dk.lng,
    dk.outcome,
    dk.knocked_at,
    dk.rep_id,
    p.name as rep_name,
    c.address,
    c.suburb,
    c.postcode
  from public.door_knocks dk
  join public.profiles p on p.id = dk.rep_id
  left join public.contacts c on c.id = dk.contact_id
  where dk.lat between p_south and p_north
    and dk.lng between p_west and p_east
    and (p_from is null or dk.knocked_at >= p_from)
    and (p_to is null or dk.knocked_at <= p_to)
    and (p_rep_ids is null or dk.rep_id = any(p_rep_ids))
    and (p_outcomes is null or dk.outcome = any(p_outcomes))
  order by dk.knocked_at desc
  limit 501;
$$;

revoke all on function public.get_admin_knocks_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  timestamptz,
  timestamptz,
  uuid[],
  public.door_outcome[]
) from public;

grant execute on function public.get_admin_knocks_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  timestamptz,
  timestamptz,
  uuid[],
  public.door_outcome[]
) to authenticated;
