-- ============================================================================
-- 0005 notifications — link notifications to the artifact they're about, so
-- they can auto-clear when that artifact is handled (approved/rejected).
-- ============================================================================

alter table public.notifications
  add column artifact_id uuid references public.artifacts(id) on delete cascade;

create index notifications_artifact_idx on public.notifications(artifact_id);
