-- ============================================================================
-- 0001 initial schema — Step 1 walking-skeleton foundation
-- Project spine (D2), structured requirements (D3), Artifact Store (D9/D18),
-- Review Workflow state + audit (D7/D10/D19), domain-event log (D6), and
-- in-app notifications (S5).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type project_stage as enum (
  'lead', 'qualified', 'proposal', 'active', 'completed', 'lost'
);

create type app_role as enum ('developer', 'pm', 'sales', 'admin');

create type artifact_review_status as enum (
  'generated', 'under_review', 'approved', 'rejected'
);

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Prevent mutation of immutable rows (artifact_versions, domain_events).
create or replace function public.prevent_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Rows in % are immutable', tg_table_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (mirrors auth.users; holds coarse roles — D10)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  roles app_role[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when an auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- clients (parent dimension — D2)
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects (the spine — D2)
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  stage project_stage not null default 'lead',
  tech_stack text,
  target_launch text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_client_id_idx on public.projects(client_id);
create index projects_stage_idx on public.projects(stage);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- requirements (structured spec input — D3)
-- ---------------------------------------------------------------------------
create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null default 'functional',
  description text not null,
  priority text not null default 'must',
  source text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requirements_project_id_idx on public.requirements(project_id);
create trigger requirements_updated_at before update on public.requirements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- artifacts (Artifact Store — D9/D18). One row per logical artifact (e.g. a
-- project's PRD); content lives in immutable artifact_versions.
-- ---------------------------------------------------------------------------
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null,                 -- e.g. 'prd'
  title text not null,
  source_module text not null,        -- e.g. 'prd-generation'
  review_status artifact_review_status not null default 'generated',
  current_version int not null default 0,
  locked_at timestamptz,              -- PRD lock (D7)
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index artifacts_project_id_idx on public.artifacts(project_id);
create index artifacts_type_idx on public.artifacts(type);
create index artifacts_review_status_idx on public.artifacts(review_status);
create trigger artifacts_updated_at before update on public.artifacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- artifact_versions (immutable snapshots — D9/D18). `content` is the rendered
-- structured snapshot (e.g. { sections: [...] }); `text_content` is flattened
-- plain text for future KB indexing (D9).
-- ---------------------------------------------------------------------------
create table public.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  version int not null,
  content jsonb not null,
  text_content text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (artifact_id, version)
);
create index artifact_versions_artifact_id_idx on public.artifact_versions(artifact_id);
create trigger artifact_versions_no_update before update on public.artifact_versions
  for each row execute function public.prevent_mutation();
create trigger artifact_versions_no_delete before delete on public.artifact_versions
  for each row execute function public.prevent_mutation();

-- ---------------------------------------------------------------------------
-- domain_events (event log — D6; also the artifact audit trail — D7)
-- ---------------------------------------------------------------------------
create table public.domain_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- e.g. 'prd.generated', 'artifact.approved'
  project_id uuid references public.projects(id) on delete cascade,
  artifact_id uuid references public.artifacts(id) on delete cascade,
  payload jsonb not null default '{}',
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index domain_events_artifact_id_idx on public.domain_events(artifact_id);
create index domain_events_project_id_idx on public.domain_events(project_id);
create index domain_events_type_idx on public.domain_events(type);
create trigger domain_events_no_update before update on public.domain_events
  for each row execute function public.prevent_mutation();
create trigger domain_events_no_delete before delete on public.domain_events
  for each row execute function public.prevent_mutation();

-- ---------------------------------------------------------------------------
-- notifications (in-app — S5)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications(user_id, read_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Internal single-org tool: any authenticated user can read/write. Role-based
-- gating of sensitive actions (e.g. approvals — D10) is enforced in the
-- application/server layer and tightened here in a later step.
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.clients             enable row level security;
alter table public.projects            enable row level security;
alter table public.requirements        enable row level security;
alter table public.artifacts           enable row level security;
alter table public.artifact_versions   enable row level security;
alter table public.domain_events       enable row level security;
alter table public.notifications       enable row level security;

-- Profiles: everyone authenticated can read; you can update only your own row.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Generic authenticated access for the operational tables.
create policy "clients_all" on public.clients
  for all to authenticated using (true) with check (true);
create policy "projects_all" on public.projects
  for all to authenticated using (true) with check (true);
create policy "requirements_all" on public.requirements
  for all to authenticated using (true) with check (true);
create policy "artifacts_all" on public.artifacts
  for all to authenticated using (true) with check (true);

-- Immutable tables: insert + read only (no update/delete policies on purpose).
create policy "artifact_versions_select" on public.artifact_versions
  for select to authenticated using (true);
create policy "artifact_versions_insert" on public.artifact_versions
  for insert to authenticated with check (true);
create policy "domain_events_select" on public.domain_events
  for select to authenticated using (true);
create policy "domain_events_insert" on public.domain_events
  for insert to authenticated with check (true);

-- Notifications: you only see and update your own.
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (true);
