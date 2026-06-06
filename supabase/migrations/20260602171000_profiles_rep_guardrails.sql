-- Story 1.4: Rep profile update guardrails

create or replace function public.enforce_rep_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Reps may only change name/phone on their own profile; admins may change anything.
  if not public.is_admin() then
    if (new.role is distinct from old.role)
       or (new.active is distinct from old.active)
       or (new.territory_id is distinct from old.territory_id)
       or (new.start_date is distinct from old.start_date) then
      raise exception 'Only admins may change role, active, territory, or start_date'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_rep_profile_update() from public;
revoke all on function public.enforce_rep_profile_update() from anon, authenticated;

create trigger profiles_rep_guardrails
  before update on public.profiles
  for each row
  execute function public.enforce_rep_profile_update();
