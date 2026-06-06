-- Story 2.5: atomic contact + knock create for online submit

create or replace function public.create_knock_with_contact(
  p_lat double precision,
  p_lng double precision,
  p_outcome public.door_outcome,
  p_notes text,
  p_follow_up_at timestamptz
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  outcome public.door_outcome,
  knocked_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_contact_id uuid;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.contacts (lat, lng, created_by)
  values (p_lat, p_lng, v_rep_id)
  returning id into v_contact_id;

  return query
  insert into public.door_knocks (
    contact_id,
    rep_id,
    outcome,
    notes,
    lat,
    lng,
    follow_up_at,
    synced
  )
  values (
    v_contact_id,
    v_rep_id,
    p_outcome,
    p_notes,
    p_lat,
    p_lng,
    p_follow_up_at,
    true
  )
  returning
    door_knocks.id,
    door_knocks.lat,
    door_knocks.lng,
    door_knocks.outcome,
    door_knocks.knocked_at;
end;
$$;

revoke all on function public.create_knock_with_contact(
  double precision,
  double precision,
  public.door_outcome,
  text,
  timestamptz
) from public;

grant execute on function public.create_knock_with_contact(
  double precision,
  double precision,
  public.door_outcome,
  text,
  timestamptz
) to authenticated;
