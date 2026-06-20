-- ============================================================================
-- 0009 code review settings — per-project config for the webhook auto-review.
-- enabled_dimensions: which review dimensions to run (null = all five).
-- skip_paths: glob-like prefixes; findings whose file starts with any of these
--             are filtered out before storing/commenting.
-- ============================================================================

create table public.code_review_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  enabled_dimensions text[] not null default '{bug,security,performance,standards,tests}',
  skip_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger code_review_settings_updated_at before update on public.code_review_settings
  for each row execute function public.set_updated_at();

alter table public.code_review_settings enable row level security;
create policy "code_review_settings_all" on public.code_review_settings
  for all to authenticated using (true) with check (true);
