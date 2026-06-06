-- Story 1.4: Rep profile fields (FR3)
alter table public.profiles
  add column if not exists start_date date;
