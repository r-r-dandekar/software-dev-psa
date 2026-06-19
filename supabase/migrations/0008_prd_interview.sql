-- ============================================================================
-- 0008 prd interview — requirements gain a heading, plus a persisted PRD
-- interview (chat + per-dimension readiness) that gates PRD generation.
-- ============================================================================

-- Requirements: heading (subject) + the existing description (now optional detail).
alter table public.requirements
  add column heading text not null default '';
alter table public.requirements
  alter column description drop not null;

-- ---------------------------------------------------------------------------
-- prd_interviews — one per project; gates PRD generation (D1/D3)
-- ---------------------------------------------------------------------------
create table public.prd_interviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  status text not null default 'in_progress',  -- in_progress | ready | generated
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger prd_interviews_updated_at before update on public.prd_interviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- prd_interview_messages — the conversation (structured assistant payloads)
-- ---------------------------------------------------------------------------
create table public.prd_interview_messages (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.prd_interviews(id) on delete cascade,
  role text not null,                 -- user | assistant
  content text not null,
  payload jsonb not null default '{}', -- assistant: { recommended, options }
  seq int not null,
  created_at timestamptz not null default now()
);
create index prd_interview_messages_idx on public.prd_interview_messages(interview_id, seq);

-- ---------------------------------------------------------------------------
-- prd_interview_dimensions — readiness checklist (D1 hybrid; D6 defer)
-- ---------------------------------------------------------------------------
create table public.prd_interview_dimensions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.prd_interviews(id) on delete cascade,
  key text not null,
  label text not null,
  state text not null default 'open',  -- open | resolved | deferred | na
  note text,                           -- resolution summary / defer reason
  is_custom boolean not null default false,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  unique (interview_id, key)
);
create index prd_interview_dimensions_idx on public.prd_interview_dimensions(interview_id);
create trigger prd_interview_dimensions_updated_at before update
  on public.prd_interview_dimensions
  for each row execute function public.set_updated_at();

alter table public.prd_interviews            enable row level security;
alter table public.prd_interview_messages    enable row level security;
alter table public.prd_interview_dimensions  enable row level security;

create policy "prd_interviews_all" on public.prd_interviews
  for all to authenticated using (true) with check (true);
create policy "prd_interview_messages_all" on public.prd_interview_messages
  for all to authenticated using (true) with check (true);
create policy "prd_interview_dimensions_all" on public.prd_interview_dimensions
  for all to authenticated using (true) with check (true);
