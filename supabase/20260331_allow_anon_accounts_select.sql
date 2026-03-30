-- Allow the demo frontend (Supabase client often runs as `anon`) to resolve account IDs.
-- Run in Supabase SQL Editor.

alter table public.accounts enable row level security;

-- idempotent: drop any previous variants we created
drop policy if exists accounts_anon_select on public.accounts;

create policy accounts_anon_select
  on public.accounts
  for select
  to anon, authenticated
  using (true);
