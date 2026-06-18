"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { updateIntegration } from "@/lib/delivery/repo";
import { updateReportSettings } from "@/lib/reports/repo";
import { generateStatusReport } from "@/lib/reports/service";
import { createGitHubConnector } from "@/lib/connectors/github";

function statusPath(projectId: string, msg?: string, isError = true) {
  if (!msg) return `/projects/${projectId}/status`;
  return `/projects/${projectId}/status?${isError ? "error" : "ok"}=${encodeURIComponent(msg)}`;
}

export async function linkRepoAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const owner = String(formData.get("owner") ?? "").trim();
  const repo = String(formData.get("repo") ?? "").trim();

  let msg = "";
  let isError = false;
  if (!owner || !repo) {
    msg = "Owner and repo are required";
    isError = true;
  } else if (!process.env.GITHUB_TOKEN) {
    msg = "Set GITHUB_TOKEN in .env.local and restart";
    isError = true;
  } else if (!(await createGitHubConnector().validateRepo(owner, repo))) {
    msg = `Cannot access ${owner}/${repo} with the configured token`;
    isError = true;
  } else {
    await updateIntegration(projectId, { github_owner: owner, github_repo: repo });
    msg = `Linked ${owner}/${repo}`;
  }

  revalidatePath(statusPath(projectId));
  redirect(statusPath(projectId, msg, isError));
}

export async function updateReportSettingsAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  await updateReportSettings(projectId, {
    tone: String(formData.get("tone")),
    formality: String(formData.get("formality")),
    notes: String(formData.get("notes") ?? "") || null,
  });
  revalidatePath(statusPath(projectId));
  redirect(statusPath(projectId, "Profile saved", false));
}

export async function generateReportAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));

  let target = "";
  let errorMsg = "";
  try {
    const artifact = await generateStatusReport(projectId, profile.id);
    target = `/projects/${projectId}/status/${artifact.id}`;
  } catch (e) {
    errorMsg = (e as Error).message;
  }
  revalidatePath(statusPath(projectId));
  redirect(errorMsg ? statusPath(projectId, errorMsg) : target);
}
