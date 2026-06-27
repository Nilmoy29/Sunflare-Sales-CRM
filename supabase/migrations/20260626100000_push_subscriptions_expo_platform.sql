-- Story M8.2: Expo push token support alongside web push (VAPID)

alter table public.push_subscriptions
  add column if not exists platform text not null default 'web'
    check (platform in ('web', 'expo'));

alter table public.push_subscriptions
  alter column p256dh drop not null,
  alter column auth drop not null;

create index if not exists idx_push_subscriptions_platform
  on public.push_subscriptions (platform);
