"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import {
  addRequirement,
  deleteRequirement,
  listRequirements,
} from "@/lib/requirements/repo";
import { getProject } from "@/lib/projects/repo";
import {
  createArtifactWithVersion,
  getProjectArtifactByType,
} from "@/lib/artifacts/store";
import { generatePrdContent } from "@/lib/prd/generate";
import { emitEvent } from "@/lib/events/bus";

export async function addRequirementAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;
  await addRequirement({
    projectId,
    description,
    category: String(formData.get("category") ?? "functional"),
    priority: String(formData.get("priority") ?? "must"),
  });
  revalidatePath(`/projects/${projectId}/requirements`);
}

export async function deleteRequirementAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const id = String(formData.get("id"));
  await deleteRequirement(id);
  revalidatePath(`/projects/${projectId}/requirements`);
}

export async function generatePrdAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));

  const existing = await getProjectArtifactByType(projectId, "prd");
  if (existing) {
    redirect(`/projects/${projectId}/prd`);
  }

  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");
  const requirements = await listRequirements(projectId);
  if (requirements.length === 0) {
    throw new Error("Add at least one requirement before generating a PRD");
  }

  const content = await generatePrdContent(project, requirements);
  const artifact = await createArtifactWithVersion({
    projectId,
    type: "prd",
    title: `PRD — ${project.name}`,
    sourceModule: "prd-generation",
    content,
    createdBy: profile.id,
  });

  await emitEvent({
    type: "prd.generated",
    artifactId: artifact.id,
    projectId,
    actorId: profile.id,
  });

  revalidatePath(`/projects/${projectId}/prd`);
  redirect(`/projects/${projectId}/prd`);
}
