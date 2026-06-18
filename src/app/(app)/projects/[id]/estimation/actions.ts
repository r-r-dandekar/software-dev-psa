"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { getProject } from "@/lib/projects/repo";
import {
  getProjectArtifactByType,
  getCurrentVersion,
} from "@/lib/artifacts/store";
import { flattenToText } from "@/lib/artifacts/content";
import { emitEvent } from "@/lib/events/bus";
import {
  updateTask,
  deleteTask,
  replaceBreakdown,
  updateSettings,
} from "@/lib/estimation/repo";
import { generateBreakdown } from "@/lib/estimation/generate";
import { syncEstimateArtifact } from "@/lib/estimation/snapshot";
import {
  performReviewActionForCurrentUser,
  lockArtifactForCurrentUser,
} from "@/lib/review/service";
import type { ReviewAction } from "@/lib/review/state";
import type { TaskDiscipline, TaskUncertainty } from "@/lib/db/types";

function estPath(projectId: string, error?: string) {
  return error
    ? `/projects/${projectId}/estimation?error=${encodeURIComponent(error)}`
    : `/projects/${projectId}/estimation`;
}

async function ensureUnlocked(projectId: string): Promise<boolean> {
  const est = await getProjectArtifactByType(projectId, "estimate");
  return !est?.locked_at;
}

async function resync(projectId: string) {
  const profile = await requireProfile();
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");
  await syncEstimateArtifact({
    projectId,
    projectName: project.name,
    createdBy: profile.id,
  });
}

export async function generateEstimateAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));

  if (!(await ensureUnlocked(projectId))) {
    redirect(estPath(projectId, "Estimate is locked"));
  }

  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const prd = await getProjectArtifactByType(projectId, "prd");
  if (!prd) redirect(estPath(projectId, "Generate a PRD first"));
  const version = await getCurrentVersion(prd!.id);
  if (!version) redirect(estPath(projectId, "PRD has no content"));

  const breakdown = await generateBreakdown(project, flattenToText(version!.content));
  await replaceBreakdown(projectId, breakdown);
  await syncEstimateArtifact({ projectId, projectName: project.name, createdBy: profile.id });

  await emitEvent({
    type: "estimate.generated",
    projectId,
    actorId: profile.id,
  });

  revalidatePath(estPath(projectId));
  redirect(estPath(projectId));
}

export async function updateTaskAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const taskId = String(formData.get("taskId"));
  if (!(await ensureUnlocked(projectId))) redirect(estPath(projectId, "Estimate is locked"));

  await updateTask(taskId, {
    min_hours: Number(formData.get("minHours")),
    max_hours: Number(formData.get("maxHours")),
    uncertainty: String(formData.get("uncertainty")) as TaskUncertainty,
    discipline: String(formData.get("discipline")) as TaskDiscipline,
    override_note: String(formData.get("overrideNote") ?? "") || undefined,
  });
  await resync(projectId);
  revalidatePath(estPath(projectId));
  redirect(estPath(projectId));
}

export async function deleteTaskAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  if (!(await ensureUnlocked(projectId))) redirect(estPath(projectId, "Estimate is locked"));
  await deleteTask(String(formData.get("taskId")));
  await resync(projectId);
  revalidatePath(estPath(projectId));
  redirect(estPath(projectId));
}

export async function updateSettingsAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  if (!(await ensureUnlocked(projectId))) redirect(estPath(projectId, "Estimate is locked"));
  await updateSettings(projectId, {
    currency: String(formData.get("currency")),
    day_rate: Number(formData.get("dayRate")),
    hours_per_day: Number(formData.get("hoursPerDay")),
    margin_pct: Number(formData.get("marginPct")),
    contingency_pct: Number(formData.get("contingencyPct")),
  });
  await resync(projectId);
  revalidatePath(estPath(projectId));
  redirect(estPath(projectId));
}

async function runReview(formData: FormData, action: ReviewAction) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const artifactId = String(formData.get("artifactId"));
  const result = await performReviewActionForCurrentUser(artifactId, action);
  revalidatePath(estPath(projectId));
  redirect(estPath(projectId, result.ok ? undefined : result.reason));
}

export async function submitEstimateAction(formData: FormData) {
  await runReview(formData, "submit");
}
export async function approveEstimateAction(formData: FormData) {
  await runReview(formData, "approve");
}
export async function rejectEstimateAction(formData: FormData) {
  await runReview(formData, "reject");
}
export async function lockEstimateAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const artifactId = String(formData.get("artifactId"));
  const result = await lockArtifactForCurrentUser(artifactId);
  revalidatePath(estPath(projectId));
  redirect(estPath(projectId, result.ok ? undefined : result.reason));
}
