-- Story 2.3: viewport-limited knock pins for rep map

create or replace function public.get_knocks_in_bbox(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_rep_id uuid
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  outcome public.door_outcome,
  knocked_at timestamptz
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
    dk.knocked_at
  from public.door_knocks dk
  where dk.rep_id = p_rep_id
    and dk.lat between p_south and p_north
    and dk.lng between p_west and p_east
  order by dk.knocked_at desc
  limit 501;
$$;

revoke all on function public.get_knocks_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  uuid
) from public;

grant execute on function public.get_knocks_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  uuid
) to authenticated;
