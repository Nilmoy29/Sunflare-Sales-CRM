-- Link booking form data to pipeline notes via lead_activity on book.

create or replace function public.book_d2d_appointment(
  p_lat double precision,
  p_lng double precision,
  p_customer_name text,
  p_phone text,
  p_appointment_at timestamptz,
  p_closer_name text,
  p_notes text,
  p_address text,
  p_suburb text,
  p_postcode text,
  p_idempotency_key text
)
returns table (
  knock_id uuid,
  lat double precision,
  lng double precision,
  knocked_at timestamptz,
  lead_id uuid,
  lead_stage public.lead_stage
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
  v_lead_id uuid;
  v_follow_up_note text;
  v_activity_note text;
  v_existing_knock_id uuid;
  v_existing_lead_id uuid;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select dk.id, dk.knocked_at, l.id
    into v_existing_knock_id, v_knocked_at, v_existing_lead_id
    from public.door_knocks dk
    left join public.leads l on l.door_knock_id = dk.id
    where dk.rep_id = v_rep_id
      and dk.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return query
      select
        v_existing_knock_id,
        p_lat,
        p_lng,
        v_knocked_at,
        v_existing_lead_id,
        'appointment_set'::public.lead_stage;
      return;
    end if;
  end if;

  v_follow_up_note := 'Closer: ' || trim(p_closer_name);
  if p_notes is not null and trim(p_notes) <> '' then
    v_follow_up_note := v_follow_up_note || E'\n' || trim(p_notes);
  end if;

  v_activity_note := 'Appointment booked for '
    || to_char(p_appointment_at at time zone 'Australia/Sydney', 'DD Mon YYYY, HH24:MI')
    || ' with closer '
    || trim(p_closer_name);
  if p_notes is not null and trim(p_notes) <> '' then
    v_activity_note := v_activity_note || '. Notes: ' || trim(p_notes);
  end if;

  insert into public.contacts (
    first_name,
    phone,
    lat,
    lng,
    address,
    suburb,
    postcode,
    created_by
  )
  values (
    trim(p_customer_name),
    nullif(trim(coalesce(p_phone, '')), ''),
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
    'interested',
    nullif(trim(coalesce(p_notes, '')), ''),
    p_lat,
    p_lng,
    p_appointment_at,
    true,
    p_idempotency_key
  )
  returning door_knocks.id, door_knocks.knocked_at
  into v_knock_id, v_knocked_at;

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
  returning leads.id into v_lead_id;

  update public.leads
  set stage = 'appointment_set'
  where id = v_lead_id;

  insert into public.lead_activity (
    lead_id,
    actor_id,
    type,
    content
  )
  values (
    v_lead_id,
    v_rep_id,
    'stage_change',
    jsonb_build_object(
      'from_stage', 'interested',
      'to_stage', 'appointment_set'
    )::text
  );

  insert into public.lead_activity (
    lead_id,
    actor_id,
    type,
    content
  )
  values (
    v_lead_id,
    v_rep_id,
    'note',
    v_activity_note
  );

  insert into public.follow_ups (
    lead_id,
    rep_id,
    due_at,
    note,
    completed
  )
  values (
    v_lead_id,
    v_rep_id,
    p_appointment_at,
    v_follow_up_note,
    false
  );

  return query
  select
    v_knock_id,
    p_lat,
    p_lng,
    v_knocked_at,
    v_lead_id,
    'appointment_set'::public.lead_stage;
end;
$$;
