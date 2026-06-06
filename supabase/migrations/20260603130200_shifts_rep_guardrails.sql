-- Story 2.2 code review: reps may only close shifts, not reopen or alter started_at

create or replace function public.enforce_rep_shift_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.started_at is distinct from old.started_at then
      raise exception 'Only admins may change shift started_at'
        using errcode = '42501';
    end if;
    if old.ended_at is not null and new.ended_at is distinct from old.ended_at then
      raise exception 'Closed shifts cannot be modified'
        using errcode = '42501';
    end if;
    if old.ended_at is null and new.ended_at is not null and new.ended_at <= old.started_at then
      raise exception 'Shift end time must be after start time'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_rep_shift_update() from public;
revoke all on function public.enforce_rep_shift_update() from anon, authenticated;

create trigger shifts_rep_guardrails
  before update on public.shifts
  for each row
  execute function public.enforce_rep_shift_update();
