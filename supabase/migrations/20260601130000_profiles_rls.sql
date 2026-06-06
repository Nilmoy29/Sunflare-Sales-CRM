-- Story 1.3: RLS on profiles (auth foundation)

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

create policy profiles_select_own on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select
  to authenticated
  using (public.is_admin());

create policy profiles_update_own on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, update on public.profiles to authenticated;
