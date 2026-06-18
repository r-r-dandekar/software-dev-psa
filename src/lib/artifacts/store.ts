import "server-only";
import { createClient } from "@/lib/supabase/server";
import { flattenToText, type ArtifactContent } from "./content";
import type { ReviewStatus } from "@/lib/review/state";
import type { Artifact, ArtifactVersion } from "@/lib/db/types";

/**
 * Artifact Store (D9/D18). One `artifacts` row per logical artifact; every
 * snapshot is an immutable `artifact_versions` row. Editing/regenerating adds a
 * new version and bumps `current_version`.
 */

export async function createArtifactWithVersion(input: {
  projectId: string;
  type: string;
  title: string;
  sourceModule: string;
  content: ArtifactContent;
  createdBy: string;
}): Promise<Artifact> {
  const supabase = await createClient();
  const { data: artifact, error } = await supabase
    .from("artifacts")
    .insert({
      project_id: input.projectId,
      type: input.type,
      title: input.title,
      source_module: input.sourceModule,
      created_by: input.createdBy,
      current_version: 0,
      review_status: "generated",
    })
    .select("*")
    .single();
  if (error) throw error;

  await addVersion({
    artifactId: (artifact as Artifact).id,
    content: input.content,
    createdBy: input.createdBy,
  });

  return getArtifact((artifact as Artifact).id) as Promise<Artifact>;
}

/** Append a new immutable version and bump current_version. */
export async function addVersion(input: {
  artifactId: string;
  content: ArtifactContent;
  createdBy: string;
}): Promise<number> {
  const supabase = await createClient();
  const current = await getArtifact(input.artifactId);
  if (!current) throw new Error("Artifact not found");

  const version = current.current_version + 1;
  const { error: vErr } = await supabase.from("artifact_versions").insert({
    artifact_id: input.artifactId,
    version,
    content: input.content,
    text_content: flattenToText(input.content),
    created_by: input.createdBy,
  });
  if (vErr) throw vErr;

  const { error: aErr } = await supabase
    .from("artifacts")
    .update({ current_version: version })
    .eq("id", input.artifactId);
  if (aErr) throw aErr;

  return version;
}

export async function getArtifact(id: string): Promise<Artifact | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("artifacts").select("*").eq("id", id).single();
  return (data as Artifact) ?? null;
}

export async function getCurrentVersion(
  artifactId: string
): Promise<ArtifactVersion | null> {
  const artifact = await getArtifact(artifactId);
  if (!artifact) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("artifact_versions")
    .select("*")
    .eq("artifact_id", artifactId)
    .eq("version", artifact.current_version)
    .single();
  return (data as ArtifactVersion) ?? null;
}

export async function getProjectArtifactByType(
  projectId: string,
  type: string
): Promise<Artifact | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Artifact) ?? null;
}

export type QueueItem = Artifact & {
  project: { id: string; name: string } | null;
};

/** Artifacts currently awaiting review — feeds the global Review Queue (S4). */
export async function listArtifactsByStatus(
  status: ReviewStatus
): Promise<QueueItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("*, project:projects(id, name)")
    .eq("review_status", status)
    .order("updated_at", { ascending: true });
  return (data as QueueItem[]) ?? [];
}

export async function listProjectArtifacts(
  projectId: string,
  type: string
): Promise<Artifact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .eq("type", type)
    .order("created_at", { ascending: false });
  return (data as Artifact[]) ?? [];
}

export async function setReviewStatus(
  id: string,
  status: ReviewStatus
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("artifacts")
    .update({ review_status: status })
    .eq("id", id);
  if (error) throw error;
}

export async function lockArtifact(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("artifacts")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
