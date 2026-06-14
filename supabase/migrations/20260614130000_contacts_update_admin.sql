-- Allow admins to update any contact (for pipeline detail edits).

create policy contacts_update_admin on public.contacts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
