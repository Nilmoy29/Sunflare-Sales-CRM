-- Story 2.7: idempotency key for offline knock replay

alter table public.door_knocks
  add column if not exists idempotency_key text null;

create unique index if not exists door_knocks_rep_idempotency_unique
  on public.door_knocks (rep_id, idempotency_key)
  where idempotency_key is not null;

comment on column public.door_knocks.idempotency_key is
  'Client-supplied key for offline sync deduplication (Story 2.7).';
