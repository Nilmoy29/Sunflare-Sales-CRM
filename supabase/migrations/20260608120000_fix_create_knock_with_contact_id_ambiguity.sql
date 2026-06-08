-- Fix knock save: RETURNS TABLE column `id` shadowed door_knocks.id in INSERT RETURNING

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
  was_duplicate boolean,
  lead_id uuid,
  lead_created boolean
)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  v_rep_id uuid := auth.uid();
  v_contact_id uuid;
  v_knock_id uuid;
  v_knocked_at timestamptz;
  v_existing record;
  v_lead_id uuid;
  v_lead_created boolean := false;
  v_promotable boolean;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_promotable := p_outcome in ('interested', 'callback_requested');

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
      v_lead_id := null;
      v_lead_created := false;

      if v_existing.outcome in ('interested', 'callback_requested') then
        select l.id
        into v_lead_id
        from public.leads l
        where l.door_knock_id = v_existing.id
        limit 1;
      end if;

      return query
      select
        v_existing.id,
        v_existing.lat,
        v_existing.lng,
        v_existing.outcome,
        v_existing.knocked_at,
        true,
        v_lead_id,
        v_lead_created;
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
  returning contacts.id into v_contact_id;

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
    door_knocks.knocked_at
  into v_knock_id, v_knocked_at;

  if v_promotable then
    insert into public.leads (
      contact_id,
      rep_id,
      source,
      stage,
      door_knock_id
    )
    values (
      v_contact_id,
      v_rep_id,
      'd2d',
      'interested',
      v_knock_id
    )
    on conflict (door_knock_id) where door_knock_id is not null do nothing
    returning leads.id into v_lead_id;

    if v_lead_id is not null then
      v_lead_created := true;
    else
      select l.id
      into v_lead_id
      from public.leads l
      where l.door_knock_id = v_knock_id
      limit 1;
    end if;
  end if;

  return query
  select
    v_knock_id,
    p_lat,
    p_lng,
    p_outcome,
    v_knocked_at,
    false,
    v_lead_id,
    v_lead_created;
end;
$$;
