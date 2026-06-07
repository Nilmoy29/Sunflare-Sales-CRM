-- Story 6.3: territory assignment RPCs for admin assign-by-date UI

create or replace function public.get_territory_assignments_for_admin(
  p_assigned_date date default null,
  p_rep_id uuid default null,
  p_territory_id uuid default null
)
returns table (
  id uuid,
  territory_id uuid,
  territory_name text,
  rep_id uuid,
  rep_name text,
  assigned_date date,
  assigned_by uuid,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.id,
    a.territory_id,
    t.name as territory_name,
    a.rep_id,
    p.name as rep_name,
    a.assigned_date,
    a.assigned_by,
    a.created_at
  from public.territory_assignments a
  join public.territories t on t.id = a.territory_id
  join public.profiles p on p.id = a.rep_id
  where public.is_admin()
    and (p_assigned_date is null or a.assigned_date = p_assigned_date)
    and (p_rep_id is null or a.rep_id = p_rep_id)
    and (p_territory_id is null or a.territory_id = p_territory_id)
  order by a.assigned_date desc, p.name, t.name;
$$;

create or replace function public.create_territory_assignment(
  p_territory_id uuid,
  p_rep_id uuid,
  p_assigned_date date
)
returns table (
  id uuid,
  territory_id uuid,
  territory_name text,
  rep_id uuid,
  rep_name text,
  assigned_date date,
  assigned_by uuid,
  created_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  if not exists (select 1 from public.territories t where t.id = p_territory_id) then
    raise exception 'Territory not found' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_rep_id
      and p.role = 'rep'
      and p.active = true
  ) then
    raise exception 'Rep not found or inactive' using errcode = '22023';
  end if;

  begin
    insert into public.territory_assignments (
      territory_id,
      rep_id,
      assigned_date,
      assigned_by
    )
    values (p_territory_id, p_rep_id, p_assigned_date, auth.uid())
    returning territory_assignments.id into v_id;
  exception
    when unique_violation then
      raise exception 'Territory assignment already exists' using errcode = '23505';
  end;

  return query
  select
    a.id,
    a.territory_id,
    t.name as territory_name,
    a.rep_id,
    p.name as rep_name,
    a.assigned_date,
    a.assigned_by,
    a.created_at
  from public.territory_assignments a
  join public.territories t on t.id = a.territory_id
  join public.profiles p on p.id = a.rep_id
  where a.id = v_id;
end;
$$;

revoke all on function public.get_territory_assignments_for_admin(date, uuid, uuid) from public;
revoke all on function public.create_territory_assignment(uuid, uuid, date) from public;

grant execute on function public.get_territory_assignments_for_admin(date, uuid, uuid) to authenticated;
grant execute on function public.create_territory_assignment(uuid, uuid, date) to authenticated;
