-- ============================================================================
-- 0003 timeline — Step 3 Timeline Estimation
-- Manual capacity inputs (the CapacityProvider for now — D17) and a stored
-- baseline projection that Delivery Risk (Step 4) compares live velocity against.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- project_capacity (manual capacity plan; one row per project, editable)
-- ---------------------------------------------------------------------------
create table public.project_capacity (
  project_id uuid primary key references public.projects(id) on delete cascade,
  devs int not null default 1,
  hours_per_week_per_dev numeric not null default 40,
  utilization_pct numeric not null default 70,
  start_date date not null default current_date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger project_capacity_updated_at before update on public.project_capacity
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- timeline_baselines (committed projection snapshot; one per project)
-- ---------------------------------------------------------------------------
create table public.timeline_baselines (
  project_id uuid primary key references public.projects(id) on delete cascade,
  captured_at timestamptz not null default now(),
  start_date date not null,
  target_date date,
  hours_per_week numeric not null,
  effort_min numeric not null,
  effort_expected numeric not null,
  effort_max numeric not null,
  end_optimistic date,
  end_expected date,
  end_pessimistic date
);

alter table public.project_capacity   enable row level security;
alter table public.timeline_baselines enable row level security;

create policy "project_capacity_all" on public.project_capacity
  for all to authenticated using (true) with check (true);
create policy "timeline_baselines_all" on public.timeline_baselines
  for all to authenticated using (true) with check (true);
