"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emitEvent } from "@/lib/events/bus";
import { notifyUsers } from "@/lib/notifications/repo";
import { updateIntegration } from "@/lib/delivery/repo";
import { pushTasksToLinear, syncProject } from "@/lib/delivery/sync";
import { computeRisk, RISK_THRESHOLD } from "@/lib/delivery/risk";

function dPath(projectId: string, msg?: string, isError = true) {
  if (!msg) return `/projects/${projectId}/delivery`;
  const k = isError ? "error" : "ok";
  return `/projects/${projectId}/delivery?${k}=${encodeURIComponent(msg)}`;
}

export async function linkTeamAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  const linear_team_id = String(formData.get("teamId"));
  const linear_team_name = String(formData.get("teamName") || "");
  await updateIntegration(projectId, { linear_team_id, linear_team_name });
  revalidatePath(dPath(projectId));
  redirect(dPath(projectId));
}

export async function pushTasksAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  let msg: string;
  let isError = false;
  try {
    const pushed = await pushTasksToLinear(projectId);
    msg = `Pushed ${pushed} task(s) to Linear`;
  } catch (e) {
    msg = (e as Error).message;
    isError = true;
  }
  revalidatePath(dPath(projectId));
  redirect(dPath(projectId, msg, isError));
}

export async function syncNowAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));
  let msg = "Synced from Linear";
  let isError = false;
  try {
    await syncProject(projectId);
    const risk = await computeRisk(projectId);

    // Proactive at-risk alert: notify approvers + emit event.
    if (risk.probability !== null && risk.probability < RISK_THRESHOLD) {
      // Service-role: this system notification must reach all PMs/Admins
      // regardless of the acting user's row-level read permissions.
      const admin = createAdminClient();
      const { data } = await admin
        .from("profiles")
        .select("id")
        .overlaps("roles", ["pm", "admin"]);
      const ids = ((data as { id: string }[]) ?? []).map((p) => p.id);
      await notifyUsers(ids, {
        type: "milestone_at_risk",
        title: "Delivery at risk",
        body: `On-time probability ${risk.probability}% (below ${RISK_THRESHOLD}%).`,
        link: `/projects/${projectId}/delivery`,
      });
      await emitEvent({
        type: "milestone.at_risk",
        projectId,
        actorId: profile.id,
        payload: { probability: risk.probability },
      });
    }
  } catch (e) {
    msg = (e as Error).message;
    isError = true;
  }
  revalidatePath(dPath(projectId));
  redirect(dPath(projectId, msg, isError));
}
