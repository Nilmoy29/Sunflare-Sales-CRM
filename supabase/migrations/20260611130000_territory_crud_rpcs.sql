-- Story 6.2: territory CRUD RPCs for admin draw/save UI

create or replace function public.get_territories_for_admin()
returns table (
  id uuid,
  name text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
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
    t.notes,
    t.created_at,
    t.updated_at,
    extensions.st_asgeojson(t.polygon_geojson)::jsonb as geometry
  from public.territories t
  where public.is_admin()
  order by t.name;
$$;

create or replace function public.create_territory(
  p_name text,
  p_notes text,
  p_polygon jsonb
)
returns table (
  id uuid,
  name text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  geometry jsonb
)
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_geom extensions.geometry;
  v_id uuid;
  v_notes text;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Territory name is required' using errcode = '22023';
  end if;

  v_geom := extensions.st_setsrid(
    extensions.st_geomfromgeojson(p_polygon::text),
    4326
  );

  if extensions.st_geometrytype(v_geom) != 'ST_Polygon'
    or not extensions.st_isvalid(v_geom) then
    raise exception 'Invalid polygon geometry' using errcode = '22023';
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  insert into public.territories (name, notes, polygon_geojson, created_by_admin_id)
  values (trim(p_name), v_notes, v_geom, auth.uid())
  returning territories.id into v_id;

  return query
  select
    t.id,
    t.name,
    t.notes,
    t.created_at,
    t.updated_at,
    extensions.st_asgeojson(t.polygon_geojson)::jsonb as geometry
  from public.territories t
  where t.id = v_id;
end;
$$;

create or replace function public.update_territory(
  p_id uuid,
  p_name text default null,
  p_notes text default null,
  p_polygon jsonb default null
)
returns table (
  id uuid,
  name text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  geometry jsonb
)
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_geom extensions.geometry;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  if p_polygon is not null then
    v_geom := extensions.st_setsrid(
      extensions.st_geomfromgeojson(p_polygon::text),
      4326
    );

    if extensions.st_geometrytype(v_geom) != 'ST_Polygon'
      or not extensions.st_isvalid(v_geom) then
      raise exception 'Invalid polygon geometry' using errcode = '22023';
    end if;
  end if;

  update public.territories t
  set
    name = coalesce(nullif(trim(p_name), ''), t.name),
    notes = case
      when p_notes is null then t.notes
      else nullif(trim(p_notes), '')
    end,
    polygon_geojson = coalesce(v_geom, t.polygon_geojson)
  where t.id = p_id;

  if not found then
    raise exception 'Territory not found' using errcode = 'P0002';
  end if;

  return query
  select
    t.id,
    t.name,
    t.notes,
    t.created_at,
    t.updated_at,
    extensions.st_asgeojson(t.polygon_geojson)::jsonb as geometry
  from public.territories t
  where t.id = p_id;
end;
$$;

revoke all on function public.get_territories_for_admin() from public;
revoke all on function public.create_territory(text, text, jsonb) from public;
revoke all on function public.update_territory(uuid, text, text, jsonb) from public;

grant execute on function public.get_territories_for_admin() to authenticated;
grant execute on function public.create_territory(text, text, jsonb) to authenticated;
grant execute on function public.update_territory(uuid, text, text, jsonb) to authenticated;
