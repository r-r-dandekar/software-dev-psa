-- ============================================================================
-- 0006 status reports — Step 5 Status Report Automation
-- GitHub repo link on the integration, plus a per-project client comms profile.
-- The report itself reuses the Artifact Store / Review Workflow (type
-- 'status_report').
-- ============================================================================

alter table public.project_integrations
  add column github_owner text,
  add column github_repo text;

create table public.report_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  tone text not null default 'non_technical',   -- technical | non_technical
  formality text not null default 'formal',      -- formal | informal
  notes text,                                     -- always/never mention, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger report_settings_updated_at before update on public.report_settings
  for each row execute function public.set_updated_at();

alter table public.report_settings enable row level security;
create policy "report_settings_all" on public.report_settings
  for all to authenticated using (true) with check (true);
