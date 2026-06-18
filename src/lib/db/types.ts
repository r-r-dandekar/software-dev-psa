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
