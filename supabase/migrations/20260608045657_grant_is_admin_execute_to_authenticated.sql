-- Fix RLS: is_admin() is referenced in policy expressions and must remain
-- executable by authenticated. Revoking in harden_function_security broke
-- profile reads and all admin/rep API routes (permission denied for is_admin).

grant execute on function public.is_admin() to authenticated;
