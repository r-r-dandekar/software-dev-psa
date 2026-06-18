-- ============================================================================
-- 0002 estimation — Step 2 Feature Estimation
-- Structured features + tasks (D3), per-project estimate settings, and reuse of
-- the Artifact Store / Review Workflow for the reviewable estimate snapshot.
-- ============================================================================

create type task_discipline as enum ('frontend', 'backend', 'qa', 'pm');
create type task_uncertainty as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------------
-- features (structured spec entities derived from the PRD — D3)
-- ---------------------------------------------------------------------------
create table public.features (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index features_project_id_idx on public.features(project_id);
create trigger features_updated_at before update on public.features
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks (estimable units; the editable structured truth — D3/D5)
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  feature_id uuid references public.features(id) on delete set null,
  title text not null,
  discipline task_discipline not null default 'backend',
  min_hours numeric not null default 0,
  max_hours numeric not null default 0,
  uncertainty task_uncertainty not null default 'medium',
  assumptions text,
  override_note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_feature_id_idx on public.tasks(feature_id);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- estimate_settings (per-project live quote config; editable — one row/project)
-- ---------------------------------------------------------------------------
create table public.estimate_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  currency text not null default 'INR',
  day_rate numeric not null default 30000,
  hours_per_day numeric not null default 8,
  margin_pct numeric not null default 30,
  contingency_pct numeric not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger estimate_settings_updated_at before update on public.estimate_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (coarse authenticated access, consistent with 0001)
-- ---------------------------------------------------------------------------
alter table public.features          enable row level security;
alter table public.tasks             enable row level security;
alter table public.estimate_settings enable row level security;

create policy "features_all" on public.features
  for all to authenticated using (true) with check (true);
create policy "tasks_all" on public.tasks
  for all to authenticated using (true) with check (true);
create policy "estimate_settings_all" on public.estimate_settings
  for all to authenticated using (true) with check (true);
