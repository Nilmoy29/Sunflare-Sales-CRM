-- Admin territory delete (removes dated assignments first)

create or replace function public.delete_territory(p_id uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  delete from public.territory_assignments
  where territory_id = p_id;

  delete from public.territories
  where id = p_id;

  if not found then
    raise exception 'Territory not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_territory(uuid) from public;
grant execute on function public.delete_territory(uuid) to authenticated;
