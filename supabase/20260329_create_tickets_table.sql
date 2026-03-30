-- Support tickets (used by /support page)
-- Requires public.accounts(id). Safe to re-run.

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

create index if not exists idx_tickets_account_id on public.tickets (account_id);
create index if not exists idx_tickets_priority on public.tickets (priority);
create index if not exists idx_tickets_status on public.tickets (status);
create index if not exists idx_tickets_created_at on public.tickets (created_at desc);

alter table public.tickets enable row level security;

drop policy if exists tickets_authenticated_all on public.tickets;
create policy tickets_authenticated_all
  on public.tickets
  for all
  to authenticated
  using (true)
  with check (true);
