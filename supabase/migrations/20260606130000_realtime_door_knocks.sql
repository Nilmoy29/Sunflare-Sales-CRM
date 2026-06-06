-- Story 3.2: enable Realtime INSERT events for admin activity feed
-- Story 5.1: alter publication supabase_realtime add table public.call_logs;

do $$
begin
  alter publication supabase_realtime add table public.door_knocks;
exception
  when duplicate_object then null;
end $$;
