-- Story 4.1 code review: scope follow_ups rep policies to owned leads

drop policy if exists follow_ups_insert_rep on public.follow_ups;
drop policy if exists follow_ups_update_rep on public.follow_ups;

create policy follow_ups_insert_rep on public.follow_ups
  for insert
  to authenticated
  with check (
    rep_id = auth.uid()
    and exists (
      select 1
      from public.leads l
      where l.id = lead_id
        and l.rep_id = auth.uid()
    )
  );

create policy follow_ups_update_rep on public.follow_ups
  for update
  to authenticated
  using (rep_id = auth.uid())
  with check (
    rep_id = auth.uid()
    and exists (
      select 1
      from public.leads l
      where l.id = lead_id
        and l.rep_id = auth.uid()
    )
  );
