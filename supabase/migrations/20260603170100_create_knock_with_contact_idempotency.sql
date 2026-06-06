-- Story 2.7: extend create_knock_with_contact with idempotency + duplicate detection

drop function if exists public.create_knock_with_contact(
  double precision,
  double precision,
  public.door_outcome,
  text,
  timestamptz,
  text,
  text,
  text
);

create or replace function public.create_knock_with_contact(
  p_lat double precision,
  p_lng double precision,
  p_outcome public.door_outcome,
  p_notes text,
  p_follow_up_at timestamptz,
  p_address text,
  p_suburb text,
  p_postcode text,
  p_idempotency_key text
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  outcome public.door_outcome,
  knocked_at timestamptz,
  was_duplicate boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_contact_id uuid;
  v_existing record;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select
      dk.id,
      dk.lat,
      dk.lng,
      dk.outcome,
      dk.knocked_at
    into v_existing
    from public.door_knocks dk
    where dk.rep_id = v_rep_id
      and dk.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return query
      select
        v_existing.id,
        v_existing.lat,
        v_existing.lng,
        v_existing.outcome,
        v_existing.knocked_at,
        true;
      return;
    end if;
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
    synced,
    idempotency_key
  )
  values (
    v_contact_id,
    v_rep_id,
    p_outcome,
    p_notes,
    p_lat,
    p_lng,
    p_follow_up_at,
    true,
    p_idempotency_key
  )
  returning
    door_knocks.id,
    door_knocks.lat,
    door_knocks.lng,
    door_knocks.outcome,
    door_knocks.knocked_at,
    false;
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
  text,
  text
) to authenticated;
