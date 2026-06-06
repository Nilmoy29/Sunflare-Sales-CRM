-- Story 2.10: prior knocks near a coordinate (cross-rep, proximity)

create or replace function public.get_knocks_near_point(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 40,
  p_limit int default 15
)
returns table (
  id uuid,
  outcome public.door_outcome,
  knocked_at timestamptz,
  rep_id uuid,
  rep_name text,
  is_own boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    dk.id,
    dk.outcome,
    dk.knocked_at,
    dk.rep_id,
    p.name as rep_name,
    (dk.rep_id = auth.uid()) as is_own
  from public.door_knocks dk
  join public.profiles p on p.id = dk.rep_id
  where auth.uid() is not null
    and st_dwithin(
      st_setsrid(st_makepoint(dk.lng, dk.lat), 4326)::geography,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  order by dk.knocked_at desc
  limit least(p_limit, 50);
$$;

revoke all on function public.get_knocks_near_point(
  double precision,
  double precision,
  double precision,
  int
) from public;

grant execute on function public.get_knocks_near_point(
  double precision,
  double precision,
  double precision,
  int
) to authenticated;
