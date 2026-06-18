import { describe, it, expect } from "vitest";
import {
  expectedHours,
  totals,
  disciplineTotals,
  withContingency,
  confidence,
  confidenceLabel,
  quote,
  riskReport,
  computeEstimate,
  type EngineTask,
  type EstimateSettings,
} from "@/lib/estimation/engine";

const settings: EstimateSettings = {
  currency: "INR",
  dayRate: 30000,
  hoursPerDay: 8,
  marginPct: 30,
  contingencyPct: 15,
};

const tasks: EngineTask[] = [
  { title: "Auth UI", discipline: "frontend", minHours: 8, maxHours: 12, uncertainty: "low" },
  { title: "Auth API", discipline: "backend", minHours: 10, maxHours: 30, uncertainty: "high" },
  { title: "Tests", discipline: "qa", minHours: 4, maxHours: 8, uncertainty: "medium" },
];

describe("estimation engine", () => {
  it("computes expected hours as the midpoint", () => {
    expect(expectedHours({ minHours: 10, maxHours: 30 })).toBe(20);
  });

  it("rolls up totals", () => {
    expect(totals(tasks)).toEqual({ min: 22, max: 50, expected: 36 });
  });

  it("rolls up per discipline", () => {
    const d = disciplineTotals(tasks);
    expect(d.backend).toEqual({ min: 10, max: 30, expected: 20 });
    expect(d.frontend.expected).toBe(10);
    expect(d.pm).toEqual({ min: 0, max: 0, expected: 0 });
  });

  it("applies a contingency buffer", () => {
    expect(withContingency(100, 15)).toBeCloseTo(115);
  });

  it("weights confidence by expected hours", () => {
    // backend (20h, high=0.3) dominates -> low confidence
    const score = confidence(tasks);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(75);
    expect(confidenceLabel(score)).not.toBe("low");
  });

  it("returns 0 confidence for no tasks", () => {
    expect(confidence([])).toBe(0);
  });

  it("computes a quote range with contingency + margin", () => {
    const q = quote(tasks, settings);
    // hourly = 30000/8 = 3750; minH = 22*1.15 = 25.3; cost = 94875; *1.3 margin
    expect(q.hourlyRate).toBe(3750);
    expect(q.contingencyHours.min).toBeCloseTo(25.3);
    expect(q.quoteMin).toBeCloseTo(25.3 * 3750 * 1.3);
    expect(q.quoteMax).toBeGreaterThan(q.quoteMin);
  });

  it("orders risks by uncertainty then spread", () => {
    const risks = riskReport(tasks);
    expect(risks[0].title).toBe("Auth API"); // high uncertainty first
    expect(risks).toHaveLength(3);
  });

  it("computes a full estimate result", () => {
    const r = computeEstimate(tasks, settings);
    expect(r.totals.expected).toBe(36);
    expect(r.risks[0].uncertainty).toBe("high");
    expect(r.quote.quoteMax).toBeGreaterThan(r.quote.quoteMin);
  });
});
