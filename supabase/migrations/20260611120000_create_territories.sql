-- Story 6.1: territories + territory_assignments tables (FR59, FR19 foundation)

create table public.territories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  polygon_geojson extensions.geometry(Polygon, 4326) not null,
  notes text,
  created_by_admin_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger territories_set_updated_at
  before update on public.territories
  for each row
  execute function public.set_updated_at();

create index idx_territories_polygon on public.territories
  using gist (polygon_geojson);

create index idx_territories_name on public.territories (name);

create table public.territory_assignments (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid not null references public.territories (id) on delete restrict,
  rep_id uuid not null references public.profiles (id) on delete restrict,
  assigned_date date not null,
  assigned_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index idx_territory_assignments_unique
  on public.territory_assignments (territory_id, rep_id, assigned_date);

create index idx_territory_assignments_rep_date
  on public.territory_assignments (rep_id, assigned_date);

create index idx_territory_assignments_territory_date
  on public.territory_assignments (territory_id, assigned_date);

alter table public.profiles
  add constraint profiles_territory_id_fkey
  foreign key (territory_id) references public.territories (id) on delete set null;
