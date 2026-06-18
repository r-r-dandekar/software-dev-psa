-- ============================================================================
-- 0004 delivery — Step 4 Delivery Risk
-- Pluggable integration link (Linear), task sync fields, and velocity snapshots
-- (the Telemetry Store — D4/D11). Delivery Risk reuses the Projection Engine.
-- ============================================================================

create type task_status as enum ('todo', 'in_progress', 'done', 'canceled');

-- ---------------------------------------------------------------------------
-- project_integrations (pluggable connector link; Linear first — D11)
-- ---------------------------------------------------------------------------
create table public.project_integrations (
  project_id uuid primary key references public.projects(id) on delete cascade,
  provider text not null default 'linear',
  linear_team_id text,
  linear_team_name text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger project_integrations_updated_at before update on public.project_integrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks: add execution-tracking fields synced from the connector
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column status task_status not null default 'todo',
  add column completed_at timestamptz,
  add column external_id text,        -- Linear issue id
  add column external_key text;       -- Linear identifier (e.g. ABC-123)
create index tasks_external_id_idx on public.tasks(external_id);

-- ---------------------------------------------------------------------------
-- velocity_snapshots (Telemetry Store time series — D4/D5)
-- ---------------------------------------------------------------------------
create table public.velocity_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_date date not null default current_date,
  completed_hours numeric not null default 0,
  total_hours numeric not null default 0,
  done_count int not null default 0,
  total_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, snapshot_date)
);
create index velocity_snapshots_project_idx on public.velocity_snapshots(project_id, snapshot_date);

alter table public.project_integrations enable row level security;
alter table public.velocity_snapshots   enable row level security;

create policy "project_integrations_all" on public.project_integrations
  for all to authenticated using (true) with check (true);
create policy "velocity_snapshots_all" on public.velocity_snapshots
  for all to authenticated using (true) with check (true);
