-- Story 1.2: profiles table + auth.users sync trigger (RLS added in Story 1.3)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  role public.user_role not null default 'rep',
  territory_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_active_idx on public.profiles (active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text := new.raw_user_meta_data->>'role';
  resolved_role public.user_role := 'rep';
begin
  if meta_role in ('admin', 'rep') then
    resolved_role := meta_role::public.user_role;
  end if;

  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    resolved_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- RLS policies: Story 1.3 (do not enable here — AC5)
