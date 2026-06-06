-- Story 2.6: persist address on contact at knock create

drop function if exists public.create_knock_with_contact(
  double precision,
  double precision,
  public.door_outcome,
  text,
  timestamptz
);

create or replace function public.create_knock_with_contact(
  p_lat double precision,
  p_lng double precision,
  p_outcome public.door_outcome,
  p_notes text,
  p_follow_up_at timestamptz,
  p_address text,
  p_suburb text,
  p_postcode text
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

  insert into public.contacts (
    lat,
    lng,
    address,
    suburb,
    postcode,
    created_by
  )
  values (
    p_lat,
    p_lng,
    p_address,
    p_suburb,
    p_postcode,
    v_rep_id
  )
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
  timestamptz,
  text,
  text,
  text
) from public;

grant execute on function public.create_knock_with_contact(
  double precision,
  double precision,
  public.door_outcome,
  text,
  timestamptz,
  text,
  text,
  text
) to authenticated;
