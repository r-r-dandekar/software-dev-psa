"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { reviewPullRequest } from "@/lib/codereview/service";

export async function reviewPrAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));
  const prNumber = Number(formData.get("prNumber"));

  let target = "";
  let errorMsg = "";
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    errorMsg = "Enter a valid PR number";
  } else {
    try {
      const artifact = await reviewPullRequest(projectId, prNumber, profile.id);
      target = `/projects/${projectId}/review/${artifact.id}`;
    } catch (e) {
      errorMsg = (e as Error).message;
    }
  }

  revalidatePath(`/projects/${projectId}/review`);
  redirect(
    errorMsg
      ? `/projects/${projectId}/review?error=${encodeURIComponent(errorMsg)}`
      : target
  );
}
