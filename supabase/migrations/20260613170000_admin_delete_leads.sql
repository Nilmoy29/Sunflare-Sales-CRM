-- Admin can delete pipeline leads; cascade removes activity and follow-ups

alter table public.lead_activity
  drop constraint lead_activity_lead_id_fkey,
  add constraint lead_activity_lead_id_fkey
    foreign key (lead_id) references public.leads (id) on delete cascade;

alter table public.follow_ups
  drop constraint follow_ups_lead_id_fkey,
  add constraint follow_ups_lead_id_fkey
    foreign key (lead_id) references public.leads (id) on delete cascade;

create policy leads_delete_admin on public.leads
  for delete
  to authenticated
  using (public.is_admin());

create policy lead_activity_delete_admin on public.lead_activity
  for delete
  to authenticated
  using (public.is_admin());

create policy follow_ups_delete_admin on public.follow_ups
  for delete
  to authenticated
  using (public.is_admin());

grant delete on public.leads to authenticated;
grant delete on public.lead_activity to authenticated;
grant delete on public.follow_ups to authenticated;
