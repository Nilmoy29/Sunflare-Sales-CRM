-- Story 4.8: push subscriptions + follow-up reminder tracking

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_push_subscriptions_rep_id
  on public.push_subscriptions (rep_id);

alter table public.follow_ups
  add column if not exists reminded_at timestamptz null;

create index idx_follow_ups_due_unreminded
  on public.follow_ups (due_at)
  where completed = false and reminded_at is null;

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_rep on public.push_subscriptions
  for select
  to authenticated
  using (rep_id = auth.uid());

create policy push_subscriptions_insert_rep on public.push_subscriptions
  for insert
  to authenticated
  with check (rep_id = auth.uid());

create policy push_subscriptions_update_rep on public.push_subscriptions
  for update
  to authenticated
  using (rep_id = auth.uid())
  with check (rep_id = auth.uid());

create policy push_subscriptions_delete_rep on public.push_subscriptions
  for delete
  to authenticated
  using (rep_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
