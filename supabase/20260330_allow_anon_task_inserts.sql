-- Demo convenience: allow inserts/selects from anon + authenticated.
-- This is needed because the frontend AuthProvider is currently mocked,
-- so Supabase client calls often come through the `anon` role.

-- TASKS
alter table public.tasks enable row level security;
drop policy if exists tasks_authenticated_all on public.tasks;
drop policy if exists tasks_anon_and_authenticated_all on public.tasks;
create policy tasks_anon_and_authenticated_all
  on public.tasks
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ANALYSES
alter table public.account_analyses enable row level security;
drop policy if exists analyses_authenticated_all on public.account_analyses;
drop policy if exists analyses_anon_and_authenticated_all on public.account_analyses;
create policy analyses_anon_and_authenticated_all
  on public.account_analyses
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- DECISIONS
alter table public.account_decisions enable row level security;
drop policy if exists decisions_authenticated_all on public.account_decisions;
drop policy if exists decisions_anon_and_authenticated_all on public.account_decisions;
create policy decisions_anon_and_authenticated_all
  on public.account_decisions
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ACTION EVENTS
alter table public.account_action_events enable row level security;
drop policy if exists action_events_authenticated_all on public.account_action_events;
drop policy if exists action_events_anon_and_authenticated_all on public.account_action_events;
create policy action_events_anon_and_authenticated_all
  on public.account_action_events
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- TICKETS (optional, in case you still use the support page)
alter table public.tickets enable row level security;
drop policy if exists tickets_authenticated_all on public.tickets;
drop policy if exists tickets_anon_and_authenticated_all on public.tickets;
create policy tickets_anon_and_authenticated_all
  on public.tickets
  for all
  to anon, authenticated
  using (true)
  with check (true);
