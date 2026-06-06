-- Story 5.3: SECURITY DEFINER RPC for call logging (cross-rep first call)

create or replace function public.create_call_log(
  p_contact_id uuid,
  p_outcome public.call_outcome,
  p_duration_seconds integer,
  p_notes text,
  p_follow_up_at timestamptz
)
returns table (
  id uuid,
  contact_id uuid,
  rep_id uuid,
  outcome public.call_outcome,
  duration_seconds integer,
  notes text,
  called_at timestamptz,
  follow_up_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.contacts c where c.id = p_contact_id
  ) then
    raise exception 'Contact not found' using errcode = 'P0002';
  end if;

  return query
  insert into public.call_logs (
    contact_id,
    rep_id,
    outcome,
    duration_seconds,
    notes,
    follow_up_at
  )
  values (
    p_contact_id,
    v_rep_id,
    p_outcome,
    p_duration_seconds,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_follow_up_at
  )
  returning
    call_logs.id,
    call_logs.contact_id,
    call_logs.rep_id,
    call_logs.outcome,
    call_logs.duration_seconds,
    call_logs.notes,
    call_logs.called_at,
    call_logs.follow_up_at;
end;
$$;

revoke all on function public.create_call_log(
  uuid,
  public.call_outcome,
  integer,
  text,
  timestamptz
) from public;

grant execute on function public.create_call_log(
  uuid,
  public.call_outcome,
  integer,
  text,
  timestamptz
) to authenticated;
