-- Story 5.2: global contact search + phone duplicate lookup for calls panel

create or replace function public.normalize_phone_digits(p_phone text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(trim(coalesce(p_phone, '')), '[^0-9+]', '', 'g'),
      '^\+',
      ''
    ),
    ''
  );
$$;

create or replace function public.search_contacts_for_calls(
  p_query text,
  p_limit int default 20
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  phone text,
  address text,
  suburb text,
  postcode text,
  is_linked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select
      trim(coalesce(p_query, '')) as raw,
      public.normalize_phone_digits(p_query) as digits
  )
  select
    c.id,
    c.first_name,
    c.last_name,
    c.phone,
    c.address,
    c.suburb,
    c.postcode,
    (
      c.created_by = auth.uid()
      or exists (
        select 1
        from public.door_knocks dk
        where dk.contact_id = c.id
          and dk.rep_id = auth.uid()
      )
      or exists (
        select 1
        from public.call_logs cl
        where cl.contact_id = c.id
          and cl.rep_id = auth.uid()
      )
    ) as is_linked
  from public.contacts c
  cross join q
  where auth.uid() is not null
    and length(q.raw) >= 2
    and (
      (
        length(q.digits) >= 3
        and public.normalize_phone_digits(c.phone) like '%' || q.digits || '%'
      )
      or c.first_name ilike '%' || q.raw || '%'
      or c.last_name ilike '%' || q.raw || '%'
      or c.address ilike '%' || q.raw || '%'
      or c.suburb ilike '%' || q.raw || '%'
      or c.postcode ilike '%' || q.raw || '%'
    )
  order by is_linked desc, c.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.find_contact_by_phone(p_phone text)
returns table (
  id uuid,
  first_name text,
  last_name text,
  phone text,
  address text,
  suburb text,
  postcode text
)
language sql
stable
security definer
set search_path = public
as $$
  with needle as (
    select public.normalize_phone_digits(p_phone) as digits
  )
  select
    c.id,
    c.first_name,
    c.last_name,
    c.phone,
    c.address,
    c.suburb,
    c.postcode
  from public.contacts c
  cross join needle
  where auth.uid() is not null
    and needle.digits is not null
    and length(needle.digits) >= 3
    and public.normalize_phone_digits(c.phone) = needle.digits
  limit 1;
$$;

revoke all on function public.normalize_phone_digits(text) from public;
revoke all on function public.search_contacts_for_calls(text, int) from public;
revoke all on function public.find_contact_by_phone(text) from public;

grant execute on function public.normalize_phone_digits(text) to authenticated;
grant execute on function public.search_contacts_for_calls(text, int) to authenticated;
grant execute on function public.find_contact_by_phone(text) to authenticated;
