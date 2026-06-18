/**
 * Estimation Engine — pure, deterministic compute (D5). No I/O, so the rollups,
 * confidence, contingency, and quote math unit-test in isolation. The AI only
 * produces the raw task breakdown; all numbers below are computed here.
 */

export type Discipline = "frontend" | "backend" | "qa" | "pm";
export type Uncertainty = "low" | "medium" | "high";

export const DISCIPLINES: Discipline[] = ["frontend", "backend", "qa", "pm"];

export type EngineTask = {
  id?: string;
  title: string;
  discipline: Discipline;
  minHours: number;
  maxHours: number;
  uncertainty: Uncertainty;
};

export type EstimateSettings = {
  currency: string;
  dayRate: number;
  hoursPerDay: number;
  marginPct: number;
  contingencyPct: number;
};

export type HourTotals = { min: number; max: number; expected: number };

/** Representative effort for a task: midpoint of its range. */
export function expectedHours(task: Pick<EngineTask, "minHours" | "maxHours">): number {
  return (task.minHours + task.maxHours) / 2;
}

export function totals(tasks: EngineTask[]): HourTotals {
  return tasks.reduce<HourTotals>(
    (acc, t) => ({
      min: acc.min + t.minHours,
      max: acc.max + t.maxHours,
      expected: acc.expected + expectedHours(t),
    }),
    { min: 0, max: 0, expected: 0 }
  );
}

export function disciplineTotals(
  tasks: EngineTask[]
): Record<Discipline, HourTotals> {
  const out = Object.fromEntries(
    DISCIPLINES.map((d) => [d, { min: 0, max: 0, expected: 0 }])
  ) as Record<Discipline, HourTotals>;
  for (const t of tasks) {
    out[t.discipline].min += t.minHours;
    out[t.discipline].max += t.maxHours;
    out[t.discipline].expected += expectedHours(t);
  }
  return out;
}

export function withContingency(hours: number, contingencyPct: number): number {
  return hours * (1 + contingencyPct / 100);
}

const UNCERTAINTY_FACTOR: Record<Uncertainty, number> = {
  low: 1,
  medium: 0.6,
  high: 0.3,
};

/**
 * Confidence 0–100, weighted by each task's expected hours so large uncertain
 * tasks drag confidence down more than small ones. Empty list => 0.
 */
export function confidence(tasks: EngineTask[]): number {
  const totalWeight = tasks.reduce((s, t) => s + expectedHours(t), 0);
  if (totalWeight === 0) return 0;
  const weighted = tasks.reduce(
    (s, t) => s + expectedHours(t) * UNCERTAINTY_FACTOR[t.uncertainty],
    0
  );
  return Math.round((weighted / totalWeight) * 100);
}

export function confidenceLabel(score: number): Uncertainty {
  if (score >= 75) return "low";
  if (score >= 50) return "medium";
  return "high";
}

export type Quote = {
  hourlyRate: number;
  contingencyHours: HourTotals;
  costMin: number;
  costMax: number;
  quoteMin: number;
  quoteMax: number;
};

export function quote(tasks: EngineTask[], settings: EstimateSettings): Quote {
  const t = totals(tasks);
  const hourlyRate = settings.hoursPerDay > 0 ? settings.dayRate / settings.hoursPerDay : 0;
  const minH = withContingency(t.min, settings.contingencyPct);
  const maxH = withContingency(t.max, settings.contingencyPct);
  const expectedH = withContingency(t.expected, settings.contingencyPct);
  const costMin = minH * hourlyRate;
  const costMax = maxH * hourlyRate;
  const marginMult = 1 + settings.marginPct / 100;
  return {
    hourlyRate,
    contingencyHours: { min: minH, max: maxH, expected: expectedH },
    costMin,
    costMax,
    quoteMin: costMin * marginMult,
    quoteMax: costMax * marginMult,
  };
}

export type RiskItem = {
  title: string;
  discipline: Discipline;
  spread: number;
  uncertainty: Uncertainty;
  reason: string;
};

const UNCERTAINTY_RANK: Record<Uncertainty, number> = { high: 2, medium: 1, low: 0 };

/** Highest-uncertainty / widest-spread tasks first (D5 risk report). */
export function riskReport(tasks: EngineTask[], topN = 5): RiskItem[] {
  return [...tasks]
    .map((t) => ({
      title: t.title,
      discipline: t.discipline,
      spread: t.maxHours - t.minHours,
      uncertainty: t.uncertainty,
      reason:
        t.uncertainty === "high"
          ? "High uncertainty — consider a spike or client clarification"
          : `Estimate spread of ${t.maxHours - t.minHours}h`,
    }))
    .sort(
      (a, b) =>
        UNCERTAINTY_RANK[b.uncertainty] - UNCERTAINTY_RANK[a.uncertainty] ||
        b.spread - a.spread
    )
    .slice(0, topN);
}

export type EstimateResult = {
  totals: HourTotals;
  byDiscipline: Record<Discipline, HourTotals>;
  confidenceScore: number;
  confidenceLabel: Uncertainty;
  quote: Quote;
  risks: RiskItem[];
};

/** One-shot computation of everything the UI / snapshot needs. */
export function computeEstimate(
  tasks: EngineTask[],
  settings: EstimateSettings
): EstimateResult {
  const score = confidence(tasks);
  return {
    totals: totals(tasks),
    byDiscipline: disciplineTotals(tasks),
    confidenceScore: score,
    confidenceLabel: confidenceLabel(score),
    quote: quote(tasks, settings),
    risks: riskReport(tasks),
  };
}
