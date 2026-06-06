-- Story 2.2: shifts + gps_pings tables (RLS in next migration)

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index shifts_one_active_per_rep_idx
  on public.shifts (rep_id)
  where ended_at is null;

create index idx_shifts_rep_started_at on public.shifts (rep_id, started_at desc);

create table public.gps_pings (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id) on delete restrict,
  shift_id uuid not null references public.shifts (id) on delete restrict,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);

create index idx_gps_pings_shift_recorded_at
  on public.gps_pings (shift_id, recorded_at);
