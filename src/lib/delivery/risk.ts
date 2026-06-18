import "server-only";
import { listTasks } from "@/lib/estimation/repo";
import { getBaseline } from "@/lib/timeline/repo";
import { getOrCreateCapacity } from "@/lib/timeline/repo";
import {
  velocityPerWeek,
  requiredVelocityPerWeek,
  projectFromVelocity,
  onTimeProbability,
  daysBetween,
  rag,
  type Rag,
} from "@/lib/projection/engine";
import { DISCIPLINES, type Discipline } from "@/lib/estimation/engine";
import type { Task } from "@/lib/db/types";

const weight = (t: Task) => (Number(t.min_hours) + Number(t.max_hours)) / 2;
const todayIso = () => new Date().toISOString().slice(0, 10);

export const RISK_THRESHOLD = 75;

export type RiskResult = {
  hasData: boolean;
  totalHours: number;
  completedHours: number;
  remainingHours: number;
  pctComplete: number;
  elapsedDays: number;
  actualVelocity: number;
  requiredVelocity: number | null;
  projectedEnd: string | null;
  targetDate: string | null;
  probability: number | null;
  rag: Rag | null;
  startDate: string;
  bottlenecks: { discipline: Discipline; pctComplete: number }[];
  brief: string[];
};

export async function computeRisk(projectId: string): Promise<RiskResult> {
  const [tasks, baseline, capacity] = await Promise.all([
    listTasks(projectId),
    getBaseline(projectId),
    getOrCreateCapacity(projectId),
  ]);

  const active = tasks.filter((t) => t.status !== "canceled");
  const totalHours = active.reduce((s, t) => s + weight(t), 0);
  const completedHours = active
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + weight(t), 0);
  const remainingHours = Math.max(0, totalHours - completedHours);
  const pctComplete = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

  const startDate = baseline?.start_date ?? capacity.start_date;
  const today = todayIso();
  const elapsedDays = Math.max(0, daysBetween(startDate, today));
  const actualVelocity = velocityPerWeek(completedHours, elapsedDays);

  const targetDate =
    baseline?.target_date ?? capacity.target_date ?? baseline?.end_expected ?? null;
  const requiredVelocity = targetDate
    ? requiredVelocityPerWeek(remainingHours, today, targetDate)
    : null;
  const projectedEnd = projectFromVelocity(remainingHours, actualVelocity, today).endDate;
  const probability =
    targetDate && requiredVelocity !== null
      ? onTimeProbability(actualVelocity, requiredVelocity)
      : null;
  const ragStatus = probability !== null ? rag(probability, RISK_THRESHOLD) : null;

  // Per-discipline progress → least-progressed first.
  const bottlenecks = DISCIPLINES.map((d) => {
    const ds = active.filter((t) => t.discipline === d);
    const tot = ds.reduce((s, t) => s + weight(t), 0);
    const done = ds.filter((t) => t.status === "done").reduce((s, t) => s + weight(t), 0);
    return { discipline: d, pctComplete: tot > 0 ? Math.round((done / tot) * 100) : 100 };
  })
    .filter((b) => active.some((t) => t.discipline === b.discipline))
    .sort((a, b) => a.pctComplete - b.pctComplete);

  const brief: string[] = [];
  if (completedHours === 0) {
    brief.push("No work marked complete yet — velocity cannot be measured.");
  } else if (probability !== null) {
    if (ragStatus === "red") {
      brief.push(
        `At current velocity (${actualVelocity.toFixed(1)}h/wk) the project is unlikely to hit ${targetDate}.`
      );
      if (requiredVelocity && Number.isFinite(requiredVelocity)) {
        brief.push(
          `Required velocity is ${requiredVelocity.toFixed(1)}h/wk — consider adding capacity, de-scoping, or moving the date.`
        );
      }
    } else if (ragStatus === "amber") {
      brief.push("Delivery is close to the line — monitor velocity and the top bottleneck.");
    } else {
      brief.push("On track at the current velocity.");
    }
  }
  if (bottlenecks[0] && bottlenecks[0].pctComplete < 100) {
    brief.push(`Least-progressed discipline: ${bottlenecks[0].discipline} (${bottlenecks[0].pctComplete}% done).`);
  }

  return {
    hasData: active.length > 0,
    totalHours,
    completedHours,
    remainingHours,
    pctComplete,
    elapsedDays,
    actualVelocity,
    requiredVelocity,
    projectedEnd,
    targetDate,
    probability,
    rag: ragStatus,
    startDate,
    bottlenecks,
    brief,
  };
}
