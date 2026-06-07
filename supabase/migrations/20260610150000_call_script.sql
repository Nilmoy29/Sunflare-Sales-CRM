-- Story 5.7: singleton call script configuration (rep read; admin update in 7.8)

create table public.call_script (
  id int primary key default 1 check (id = 1),
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.call_script (id, body)
values (
  1,
  E'Hi, this is [Your Name] from Sunflare Solar.\n\nWe help homeowners reduce their electricity bills with solar.\n\nDo you have a minute to talk about your energy usage?'
)
on conflict (id) do nothing;

alter table public.call_script enable row level security;

create policy call_script_select_authenticated on public.call_script
  for select to authenticated using (true);

create policy call_script_update_admin on public.call_script
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.call_script to authenticated;
grant update on public.call_script to authenticated;
