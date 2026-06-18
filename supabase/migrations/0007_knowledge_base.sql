-- ============================================================================
-- 0007 knowledge base — Step 7 Living Knowledge Base
-- pgvector store over the artifact corpus (D9), a query log for the feedback
-- loop, and a cosine-similarity match function for RAG retrieval.
-- ============================================================================

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- kb_chunks — embedded chunks of indexed artifacts (768-dim, text-embedding-004)
-- ---------------------------------------------------------------------------
create table public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  artifact_id uuid references public.artifacts(id) on delete cascade,
  source_type text not null default 'artifact',
  source_ref text not null,          -- human label, e.g. the artifact title
  chunk_index int not null default 0,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);
create index kb_chunks_artifact_idx on public.kb_chunks(artifact_id);
create index kb_chunks_embedding_idx on public.kb_chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- kb_queries — query log + helpfulness feedback (flag-incorrect loop)
-- ---------------------------------------------------------------------------
create table public.kb_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  question text not null,
  answer text not null,
  citations jsonb not null default '[]',
  is_gap boolean not null default false,
  helpful boolean,
  created_at timestamptz not null default now()
);
create index kb_queries_created_idx on public.kb_queries(created_at desc);

-- ---------------------------------------------------------------------------
-- match_kb_chunks — cosine-similarity retrieval for RAG
-- ---------------------------------------------------------------------------
create or replace function public.match_kb_chunks(
  query_embedding vector(768),
  match_count int default 6
)
returns table (
  id uuid,
  artifact_id uuid,
  project_id uuid,
  source_ref text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    c.id, c.artifact_id, c.project_id, c.source_ref, c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.kb_chunks  enable row level security;
alter table public.kb_queries enable row level security;

create policy "kb_chunks_all" on public.kb_chunks
  for all to authenticated using (true) with check (true);
create policy "kb_queries_all" on public.kb_queries
  for all to authenticated using (true) with check (true);
