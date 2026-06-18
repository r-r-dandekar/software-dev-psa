"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { getProject } from "@/lib/projects/repo";
import { listRequirements } from "@/lib/requirements/repo";
import {
  getArtifact,
  getCurrentVersion,
  addVersion,
  setReviewStatus,
} from "@/lib/artifacts/store";
import { replaceSectionBody } from "@/lib/artifacts/content";
import { generatePrdSection } from "@/lib/prd/generate";
import { emitEvent } from "@/lib/events/bus";
import {
  performReviewActionForCurrentUser,
  lockArtifactForCurrentUser,
} from "@/lib/review/service";
import type { ReviewAction } from "@/lib/review/state";

function prdPath(projectId: string, error?: string) {
  return error
    ? `/projects/${projectId}/prd?error=${encodeURIComponent(error)}`
    : `/projects/${projectId}/prd`;
}

async function mutateSection(
  projectId: string,
  artifactId: string,
  sectionKey: string,
  produceBody: () => Promise<string>,
  eventType: string
) {
  const profile = await requireProfile();
  const artifact = await getArtifact(artifactId);
  if (!artifact) throw new Error("Artifact not found");
  if (artifact.locked_at) redirect(prdPath(projectId, "PRD is locked"));

  const version = await getCurrentVersion(artifactId);
  if (!version) throw new Error("No PRD version found");

  const body = await produceBody();
  const updated = replaceSectionBody(version.content, sectionKey, body);
  await addVersion({ artifactId, content: updated, createdBy: profile.id });
  // Content changed → prior approval is stale; back to draft.
  await setReviewStatus(artifactId, "generated");
  await emitEvent({
    type: eventType,
    artifactId,
    projectId,
    actorId: profile.id,
    payload: { section: sectionKey },
  });
  revalidatePath(prdPath(projectId));
}

export async function editSectionAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const artifactId = String(formData.get("artifactId"));
  const sectionKey = String(formData.get("sectionKey"));
  const body = String(formData.get("body") ?? "");
  await mutateSection(projectId, artifactId, sectionKey, async () => body, "prd.edited");
  redirect(prdPath(projectId));
}

export async function regenerateSectionAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const artifactId = String(formData.get("artifactId"));
  const sectionKey = String(formData.get("sectionKey"));
  await mutateSection(
    projectId,
    artifactId,
    sectionKey,
    async () => {
      const project = await getProject(projectId);
      if (!project) throw new Error("Project not found");
      const requirements = await listRequirements(projectId);
      return generatePrdSection(project, requirements, sectionKey);
    },
    "prd.section_regenerated"
  );
  redirect(prdPath(projectId));
}

async function runReview(formData: FormData, action: ReviewAction) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const artifactId = String(formData.get("artifactId"));
  const result = await performReviewActionForCurrentUser(artifactId, action);
  revalidatePath(prdPath(projectId));
  redirect(prdPath(projectId, result.ok ? undefined : result.reason));
}

export async function submitAction(formData: FormData) {
  await runReview(formData, "submit");
}
export async function approveAction(formData: FormData) {
  await runReview(formData, "approve");
}
export async function rejectAction(formData: FormData) {
  await runReview(formData, "reject");
}

export async function lockAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const artifactId = String(formData.get("artifactId"));
  const result = await lockArtifactForCurrentUser(artifactId);
  revalidatePath(prdPath(projectId));
  redirect(prdPath(projectId, result.ok ? undefined : result.reason));
}
