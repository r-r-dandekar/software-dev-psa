"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import {
  startOrGetInterview,
  sendInterviewMessage,
  processPendingTurn,
  deferDimension,
  revisitDimension,
  generatePrdFromInterview,
} from "@/lib/prd/interview-service";

const prdPath = (projectId: string) => `/projects/${projectId}/prd`;

function back(projectId: string, error?: string): never {
  const base = `${prdPath(projectId)}?interview=1`;
  redirect(error ? `${base}&error=${encodeURIComponent(error)}` : base);
}

export async function startInterviewAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  let error = "";
  try {
    await startOrGetInterview(projectId);
  } catch (e) {
    error = (e as Error).message; // interview/pending state is saved; resumable
  }
  revalidatePath(prdPath(projectId));
  back(projectId, error || undefined);
}

export async function sendMessageAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const text = String(formData.get("message") ?? "").trim();
  let error = "";
  if (text) {
    try {
      await sendInterviewMessage(projectId, text);
    } catch (e) {
      error = (e as Error).message; // answer saved; resume to finish the turn
    }
  }
  revalidatePath(prdPath(projectId));
  back(projectId, error || undefined);
}

export async function continueInterviewAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  let error = "";
  try {
    await processPendingTurn(projectId);
  } catch (e) {
    error = (e as Error).message;
  }
  revalidatePath(prdPath(projectId));
  back(projectId, error || undefined);
}

export async function deferDimensionAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  await deferDimension(projectId, String(formData.get("key")), String(formData.get("reason") ?? "Deferred by user"));
  revalidatePath(prdPath(projectId));
  back(projectId);
}

export async function revisitDimensionAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  await revisitDimension(projectId, String(formData.get("key")));
  revalidatePath(prdPath(projectId));
  back(projectId);
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
  if (error) back(projectId, error);
  redirect(prdPath(projectId));
}
