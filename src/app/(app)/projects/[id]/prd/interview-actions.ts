"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import {
  startOrGetInterview,
  sendInterviewMessage,
  deferDimension,
  revisitDimension,
  generatePrdFromInterview,
} from "@/lib/prd/interview-service";

const prdPath = (projectId: string) => `/projects/${projectId}/prd`;

export async function startInterviewAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  await startOrGetInterview(projectId);
  revalidatePath(prdPath(projectId));
  redirect(prdPath(projectId));
}

export async function sendMessageAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const text = String(formData.get("message") ?? "").trim();
  if (text) await sendInterviewMessage(projectId, text);
  revalidatePath(prdPath(projectId));
  redirect(`${prdPath(projectId)}?interview=1`);
}

export async function deferDimensionAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const key = String(formData.get("key"));
  const reason = String(formData.get("reason") ?? "Deferred by user");
  await deferDimension(projectId, key, reason);
  revalidatePath(prdPath(projectId));
  redirect(`${prdPath(projectId)}?interview=1`);
}

export async function revisitDimensionAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const key = String(formData.get("key"));
  await revisitDimension(projectId, key);
  revalidatePath(prdPath(projectId));
  redirect(`${prdPath(projectId)}?interview=1`);
}

export async function generateFromInterviewAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));
  let error = "";
  try {
    await generatePrdFromInterview(projectId, profile.id);
  } catch (e) {
    error = (e as Error).message;
  }
  revalidatePath(prdPath(projectId));
  redirect(error ? `${prdPath(projectId)}?interview=1&error=${encodeURIComponent(error)}` : prdPath(projectId));
}
