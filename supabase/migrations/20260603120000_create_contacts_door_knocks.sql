-- Story 2.1: contacts + door_knocks tables (RLS in next migration)

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  phone text,
  email text,
  address text,
  suburb text,
  postcode text,
  lat double precision,
  lng double precision,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_contacts_phone on public.contacts (phone) where phone is not null;
create index idx_contacts_created_by on public.contacts (created_by);

create table public.door_knocks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete restrict,
  rep_id uuid not null references public.profiles (id) on delete restrict,
  outcome public.door_outcome not null,
  notes text,
  knocked_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  synced boolean not null default true
);

create index idx_door_knocks_rep_id on public.door_knocks (rep_id);
create index idx_door_knocks_contact_id on public.door_knocks (contact_id);
create index idx_door_knocks_knocked_at on public.door_knocks (knocked_at desc);
create index idx_door_knocks_location on public.door_knocks
  using gist (st_setsrid(st_makepoint(lng, lat), 4326));
