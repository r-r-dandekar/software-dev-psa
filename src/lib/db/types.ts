/**
 * Hand-maintained row types mirroring the Postgres schema
 * (supabase/migrations). Kept in sync with migrations by hand for now; we can
 * switch to generated types via the Supabase CLI once it's linked.
 */
import type { ReviewStatus, AppRole } from "@/lib/review/state";
import type { ArtifactContent } from "@/lib/artifacts/content";

export type ProjectStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "active"
  | "completed"
  | "lost";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: AppRole[];
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  name: string;
  industry: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  client_id: string | null;
  name: string;
  stage: ProjectStage;
  tech_stack: string | null;
  target_launch: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Requirement = {
  id: string;
  project_id: string;
  category: string;
  description: string;
  priority: string;
  source: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Artifact = {
  id: string;
  project_id: string;
  type: string;
  title: string;
  source_module: string;
  review_status: ReviewStatus;
  current_version: number;
  locked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtifactVersion = {
  id: string;
  artifact_id: string;
  version: number;
  content: ArtifactContent;
  text_content: string;
  created_by: string | null;
  created_at: string;
};

export type Feature = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TaskDiscipline = "frontend" | "backend" | "qa" | "pm";
export type TaskUncertainty = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done" | "canceled";

export type Task = {
  id: string;
  project_id: string;
  feature_id: string | null;
  title: string;
  discipline: TaskDiscipline;
  min_hours: number;
  max_hours: number;
  uncertainty: TaskUncertainty;
  assumptions: string | null;
  override_note: string | null;
  sort_order: number;
  status: TaskStatus;
  completed_at: string | null;
  external_id: string | null;
  external_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectIntegration = {
  project_id: string;
  provider: string;
  linear_team_id: string | null;
  linear_team_name: string | null;
  github_owner: string | null;
  github_repo: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportSettings = {
  project_id: string;
  tone: string;
  formality: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type KbQuery = {
  id: string;
  user_id: string | null;
  question: string;
  answer: string;
  citations: { title: string; artifactId: string | null }[];
  is_gap: boolean;
  helpful: boolean | null;
  created_at: string;
};

export type VelocitySnapshot = {
  id: string;
  project_id: string;
  snapshot_date: string;
  completed_hours: number;
  total_hours: number;
  done_count: number;
  total_count: number;
  created_at: string;
};

export type EstimateSettingsRow = {
  project_id: string;
  currency: string;
  day_rate: number;
  hours_per_day: number;
  margin_pct: number;
  contingency_pct: number;
  created_at: string;
  updated_at: string;
};

export type ProjectCapacity = {
  project_id: string;
  devs: number;
  hours_per_week_per_dev: number;
  utilization_pct: number;
  start_date: string;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TimelineBaseline = {
  project_id: string;
  captured_at: string;
  start_date: string;
  target_date: string | null;
  hours_per_week: number;
  effort_min: number;
  effort_expected: number;
  effort_max: number;
  end_optimistic: string | null;
  end_expected: string | null;
  end_pessimistic: string | null;
};

export type DomainEvent = {
  id: string;
  type: string;
  project_id: string | null;
  artifact_id: string | null;
  payload: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};
