import "server-only";
import {
  listTasks,
  getOrCreateSettings,
  toEngineTask,
  toEngineSettings,
} from "@/lib/estimation/repo";
import { computeEstimate } from "@/lib/estimation/engine";
import { effectiveHoursPerWeek, type CapacityPlan, type EffortBand } from "@/lib/projection/engine";
import type { ProjectCapacity } from "@/lib/db/types";

/**
 * The effort band the timeline projects: contingency-adjusted hours from the
 * current estimate (min/expected/max). Returns null when there are no tasks.
 */
export async function getEffortBand(projectId: string): Promise<EffortBand | null> {
  const tasks = await listTasks(projectId);
  if (tasks.length === 0) return null;
  const settings = await getOrCreateSettings(projectId);
  const result = computeEstimate(
    tasks.map(toEngineTask),
    toEngineSettings(settings)
  );
  return {
    min: result.quote.contingencyHours.min,
    expected: result.quote.contingencyHours.expected,
    max: result.quote.contingencyHours.max,
  };
}

/** Convert stored manual capacity into the engine's CapacityPlan (D17). */
export function capacityPlan(cap: ProjectCapacity): CapacityPlan {
  return {
    hoursPerWeek: effectiveHoursPerWeek({
      devs: Number(cap.devs),
      hoursPerWeekPerDev: Number(cap.hours_per_week_per_dev),
      utilizationPct: Number(cap.utilization_pct),
    }),
    startDate: cap.start_date,
  };
}
