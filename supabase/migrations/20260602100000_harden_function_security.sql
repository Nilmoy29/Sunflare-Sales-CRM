-- Story 1.2/1.3 hardening (Supabase security advisors via MCP)

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger-only; not callable via PostgREST RPC
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

-- Used only inside RLS policy expressions
revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon, authenticated;
