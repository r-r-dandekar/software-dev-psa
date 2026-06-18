"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import {
  getArtifact,
  getCurrentVersion,
  addVersion,
  setReviewStatus,
} from "@/lib/artifacts/store";
import { emitEvent } from "@/lib/events/bus";
import {
  performReviewActionForCurrentUser,
  lockArtifactForCurrentUser,
} from "@/lib/review/service";
import type { ReviewAction } from "@/lib/review/state";

function rPath(projectId: string, reportId: string, error?: string) {
  const base = `/projects/${projectId}/status/${reportId}`;
  return error ? `${base}?error=${encodeURIComponent(error)}` : base;
}

async function runReview(formData: FormData, action: ReviewAction) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const reportId = String(formData.get("artifactId"));
  const result = await performReviewActionForCurrentUser(reportId, action);
  revalidatePath(rPath(projectId, reportId));
  redirect(rPath(projectId, reportId, result.ok ? undefined : result.reason));
}

export async function submitReportAction(formData: FormData) {
  await runReview(formData, "submit");
}
export async function approveReportAction(formData: FormData) {
  await runReview(formData, "approve");
}
export async function rejectReportAction(formData: FormData) {
  await runReview(formData, "reject");
}

export async function editReportAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));
  const reportId = String(formData.get("artifactId"));

  const artifact = await getArtifact(reportId);
  if (artifact?.locked_at) redirect(rPath(projectId, reportId, "Report already sent"));
  const version = await getCurrentVersion(reportId);
  if (!version) redirect(rPath(projectId, reportId, "No content"));

  const sections = version!.content.sections.map((s) => ({
    ...s,
    body: String(formData.get(`body_${s.key}`) ?? s.body),
  }));
  await addVersion({ artifactId: reportId, content: { sections }, createdBy: profile.id });
  await setReviewStatus(reportId, "generated");

  revalidatePath(rPath(projectId, reportId));
  redirect(rPath(projectId, reportId));
}

export async function sendReportAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));
  const reportId = String(formData.get("artifactId"));

  const result = await lockArtifactForCurrentUser(reportId);
  let error: string | undefined;
  if (result.ok) {
    await emitEvent({
      type: "status_report.sent",
      artifactId: reportId,
      projectId,
      actorId: profile.id,
    });
  } else {
    error = result.reason;
  }
  revalidatePath(rPath(projectId, reportId));
  redirect(rPath(projectId, reportId, error));
}
