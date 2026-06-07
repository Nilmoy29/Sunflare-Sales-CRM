-- Story 6.4: rep territory overlay RPC for /rep/map

create or replace function public.get_rep_territories_for_date(p_assigned_date date)
returns table (
  id uuid,
  name text,
  geometry jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.id,
    t.name,
    extensions.st_asgeojson(t.polygon_geojson)::jsonb as geometry
  from public.territory_assignments ta
  join public.territories t on t.id = ta.territory_id
  where ta.rep_id = auth.uid()
    and ta.assigned_date = p_assigned_date
  order by t.name;
$$;

revoke all on function public.get_rep_territories_for_date(date) from public;
grant execute on function public.get_rep_territories_for_date(date) to authenticated;
