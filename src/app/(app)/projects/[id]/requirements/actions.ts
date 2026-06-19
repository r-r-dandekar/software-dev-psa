"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { addRequirement, deleteRequirement } from "@/lib/requirements/repo";

export async function addRequirementAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const heading = String(formData.get("heading") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!heading) return;
  await addRequirement({
    projectId,
    heading,
    description: description || null,
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
