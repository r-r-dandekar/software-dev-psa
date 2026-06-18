"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createProjectWithClient } from "@/lib/projects/repo";

export async function createProjectAction(formData: FormData) {
  const profile = await requireProfile();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  const techStack = String(formData.get("techStack") ?? "").trim();
  const targetLaunch = String(formData.get("targetLaunch") ?? "").trim();

  if (!clientName || !projectName) {
    throw new Error("Client and project name are required");
  }

  const project = await createProjectWithClient({
    clientName,
    projectName,
    techStack: techStack || undefined,
    targetLaunch: targetLaunch || undefined,
    createdBy: profile.id,
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}/requirements`);
}
