-- Action capture tables for task workflows
-- Run in Supabase SQL Editor (safe to re-run)

create extension if not exists pgcrypto;

-- 1) Tasks (used by /tasks page + AI/decision task sync)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Todo' check (status in ('Todo', 'In Progress', 'Done')),
  assigned_to text,
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_account_id on public.tasks(account_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_created_at on public.tasks(created_at desc);

-- 2) Analyses saved from AI panel
create table if not exists public.account_analyses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  summary text,
  key_factors jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  preferred_action_index int,
  raw_analysis jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_analyses_account_id on public.account_analyses(account_id);
create index if not exists idx_account_analyses_created_at on public.account_analyses(created_at desc);

-- 3) Decisions recorded by users (manual or AI-preferred-action)
create table if not exists public.account_decisions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  action text not null,
  reasoning text,
  source text not null default 'manual' check (source in ('manual', 'ai_preferred', 'automation')),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_decisions_account_id on public.account_decisions(account_id);
create index if not exists idx_account_decisions_task_id on public.account_decisions(task_id);
create index if not exists idx_account_decisions_created_at on public.account_decisions(created_at desc);

-- 4) Action log/audit trail for automation + user actions
create table if not exists public.account_action_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  decision_id uuid references public.account_decisions(id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_action_events_account_id on public.account_action_events(account_id);
create index if not exists idx_account_action_events_task_id on public.account_action_events(task_id);
create index if not exists idx_account_action_events_decision_id on public.account_action_events(decision_id);
create index if not exists idx_account_action_events_type on public.account_action_events(event_type);
create index if not exists idx_account_action_events_created_at on public.account_action_events(created_at desc);

-- Enable RLS
alter table public.tasks enable row level security;
alter table public.account_analyses enable row level security;
alter table public.account_decisions enable row level security;
alter table public.account_action_events enable row level security;

-- Basic authenticated access policies (safe default when app-side filtering is used)
drop policy if exists tasks_authenticated_all on public.tasks;
create policy tasks_authenticated_all
  on public.tasks
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists analyses_authenticated_all on public.account_analyses;
create policy analyses_authenticated_all
  on public.account_analyses
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists decisions_authenticated_all on public.account_decisions;
create policy decisions_authenticated_all
  on public.account_decisions
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists action_events_authenticated_all on public.account_action_events;
create policy action_events_authenticated_all
  on public.account_action_events
  for all
  to authenticated
  using (true)
  with check (true);
