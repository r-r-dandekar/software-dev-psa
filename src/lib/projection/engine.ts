/**
 * Projection Engine — pure, deterministic forecasting (D12, D17).
 *
 * One engine, two entry points:
 *  - Timeline Estimation (Step 3): baseline projection from an effort band +
 *    planned capacity → predicted delivery dates.
 *  - Delivery Risk (Step 4): the same point() math fed with live velocity.
 *
 * No I/O — fully unit-testable. Capacity arrives via a CapacityPlan (the
 * manual CapacityProvider now; Resource Optimization later, same shape).
 */

export type CapacityPlan = {
  /** Effective delivery hours per calendar week (team size × hrs × utilisation). */
  hoursPerWeek: number;
  /** ISO date (YYYY-MM-DD) the work starts. */
  startDate: string;
};

/** Effort in hours (contingency already applied), as a 3-point band. */
export type EffortBand = {
  min: number;
  expected: number;
  max: number;
};

export type ProjectionPoint = {
  hours: number;
  weeks: number;
  calendarDays: number;
  /** ISO date, or null if capacity is non-positive. */
  endDate: string | null;
};

export type Projection = {
  startDate: string;
  hoursPerWeek: number;
  optimistic: ProjectionPoint; // from min effort
  expected: ProjectionPoint;
  pessimistic: ProjectionPoint; // from max effort
};

export function addCalendarDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Project a single effort figure to a completion point. */
export function point(
  hours: number,
  hoursPerWeek: number,
  startDate: string
): ProjectionPoint {
  if (hoursPerWeek <= 0) {
    return { hours, weeks: Infinity, calendarDays: Infinity, endDate: null };
  }
  const weeks = hours / hoursPerWeek;
  const calendarDays = Math.ceil(weeks * 7);
  return { hours, weeks, calendarDays, endDate: addCalendarDays(startDate, calendarDays) };
}

/** Baseline projection across the optimistic/expected/pessimistic effort band. */
export function project(effort: EffortBand, capacity: CapacityPlan): Projection {
  return {
    startDate: capacity.startDate,
    hoursPerWeek: capacity.hoursPerWeek,
    optimistic: point(effort.min, capacity.hoursPerWeek, capacity.startDate),
    expected: point(effort.expected, capacity.hoursPerWeek, capacity.startDate),
    pessimistic: point(effort.max, capacity.hoursPerWeek, capacity.startDate),
  };
}

export type TargetComparison = {
  /** target − predicted, in days. Positive = ahead of target (slack). */
  slackDays: number;
  onTime: boolean;
};

/** Compare a predicted end date to a target/contract date. */
export function compareToTarget(
  endDate: string | null,
  targetDate: string
): TargetComparison | null {
  if (!endDate) return null;
  const slackDays = daysBetween(endDate, targetDate);
  return { slackDays, onTime: slackDays >= 0 };
}

/** Effective weekly capacity from manual inputs (the CapacityProvider now). */
export function effectiveHoursPerWeek(input: {
  devs: number;
  hoursPerWeekPerDev: number;
  utilizationPct: number;
}): number {
  return input.devs * input.hoursPerWeekPerDev * (input.utilizationPct / 100);
}

// ---------------------------------------------------------------------------
// Delivery Risk (Step 4): the SAME engine fed with live velocity (D12).
// ---------------------------------------------------------------------------

/** Observed delivery rate: completed (weighted) hours per calendar week. */
export function velocityPerWeek(completedHours: number, elapsedDays: number): number {
  if (elapsedDays <= 0) return 0;
  return completedHours / (elapsedDays / 7);
}

/** Hours/week needed from now to hit the target date. */
export function requiredVelocityPerWeek(
  remainingHours: number,
  asOf: string,
  target: string
): number {
  const daysLeft = daysBetween(asOf, target);
  if (daysLeft <= 0) return remainingHours > 0 ? Infinity : 0;
  return remainingHours / (daysLeft / 7);
}

/** Project remaining work from current velocity to a completion point. */
export function projectFromVelocity(
  remainingHours: number,
  velPerWeek: number,
  asOf: string
): ProjectionPoint {
  return point(remainingHours, velPerWeek, asOf);
}

/**
 * On-time probability (0–100) from the ratio of actual to required velocity,
 * via a logistic centred at ratio=1 (exactly on pace ≈ 50%). Deterministic.
 */
export function onTimeProbability(
  actualVel: number,
  requiredVel: number
): number {
  if (requiredVel === Infinity) return 0; // target already passed, work remains
  if (requiredVel <= 0) return 100; // nothing required
  if (actualVel <= 0) return 0;
  const ratio = actualVel / requiredVel;
  const p = 100 / (1 + Math.exp(-4 * (ratio - 1)));
  return Math.round(Math.max(0, Math.min(100, p)));
}

export type Rag = "green" | "amber" | "red";

export function rag(probability: number, threshold = 75): Rag {
  if (probability >= threshold) return "green";
  if (probability >= threshold - 25) return "amber";
  return "red";
}
