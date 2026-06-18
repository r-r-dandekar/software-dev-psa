"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { emitEvent } from "@/lib/events/bus";
import {
  getOrCreateCapacity,
  updateCapacity,
  setBaseline,
} from "@/lib/timeline/repo";
import { getEffortBand, capacityPlan } from "@/lib/timeline/service";
import { project } from "@/lib/projection/engine";

function tlPath(projectId: string, error?: string) {
  return error
    ? `/projects/${projectId}/timeline?error=${encodeURIComponent(error)}`
    : `/projects/${projectId}/timeline`;
}

export async function updateCapacityAction(formData: FormData) {
  await requireProfile();
  const projectId = String(formData.get("projectId"));
  await updateCapacity(projectId, {
    devs: Number(formData.get("devs")),
    hours_per_week_per_dev: Number(formData.get("hoursPerWeekPerDev")),
    utilization_pct: Number(formData.get("utilizationPct")),
    start_date: String(formData.get("startDate")),
    target_date: String(formData.get("targetDate") || "") || null,
  });
  revalidatePath(tlPath(projectId));
  redirect(tlPath(projectId));
}

export async function setBaselineAction(formData: FormData) {
  const profile = await requireProfile();
  const projectId = String(formData.get("projectId"));

  const effort = await getEffortBand(projectId);
  if (!effort) redirect(tlPath(projectId, "Generate an estimate first"));

  const capacity = await getOrCreateCapacity(projectId);
  const plan = capacityPlan(capacity);
  const pr = project(effort!, plan);

  await setBaseline({
    project_id: projectId,
    start_date: capacity.start_date,
    target_date: capacity.target_date,
    hours_per_week: plan.hoursPerWeek,
    effort_min: effort!.min,
    effort_expected: effort!.expected,
    effort_max: effort!.max,
    end_optimistic: pr.optimistic.endDate,
    end_expected: pr.expected.endDate,
    end_pessimistic: pr.pessimistic.endDate,
  });

  await emitEvent({ type: "timeline.baseline_set", projectId, actorId: profile.id });
  revalidatePath(tlPath(projectId));
  redirect(tlPath(projectId));
}
