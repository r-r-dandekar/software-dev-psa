import { describe, it, expect } from "vitest";
import {
  addCalendarDays,
  daysBetween,
  point,
  project,
  compareToTarget,
  effectiveHoursPerWeek,
  velocityPerWeek,
  requiredVelocityPerWeek,
  projectFromVelocity,
  onTimeProbability,
  rag,
  type CapacityPlan,
  type EffortBand,
} from "@/lib/projection/engine";

describe("projection date helpers", () => {
  it("adds calendar days across month boundaries (UTC)", () => {
    expect(addCalendarDays("2026-01-30", 5)).toBe("2026-02-04");
  });
  it("computes signed day differences", () => {
    expect(daysBetween("2026-01-01", "2026-01-11")).toBe(10);
    expect(daysBetween("2026-01-11", "2026-01-01")).toBe(-10);
  });
});

describe("projection point", () => {
  it("projects hours to weeks and an end date", () => {
    const p = point(80, 40, "2026-01-01"); // 2 weeks = 14 days
    expect(p.weeks).toBe(2);
    expect(p.calendarDays).toBe(14);
    expect(p.endDate).toBe("2026-01-15");
  });
  it("rounds partial weeks up to whole calendar days", () => {
    const p = point(50, 40, "2026-01-01"); // 1.25 weeks -> ceil(8.75)=9 days
    expect(p.weeks).toBeCloseTo(1.25);
    expect(p.calendarDays).toBe(9);
  });
  it("handles non-positive capacity without crashing", () => {
    const p = point(80, 0, "2026-01-01");
    expect(p.endDate).toBeNull();
    expect(p.weeks).toBe(Infinity);
  });
});

describe("baseline projection", () => {
  const capacity: CapacityPlan = { hoursPerWeek: 40, startDate: "2026-01-01" };
  const effort: EffortBand = { min: 40, expected: 80, max: 160 };

  it("orders optimistic <= expected <= pessimistic", () => {
    const pr = project(effort, capacity);
    expect(pr.optimistic.calendarDays).toBeLessThanOrEqual(pr.expected.calendarDays);
    expect(pr.expected.calendarDays).toBeLessThanOrEqual(pr.pessimistic.calendarDays);
    expect(pr.expected.endDate).toBe("2026-01-15");
  });
});

describe("target comparison", () => {
  it("reports slack and on-time when ahead of target", () => {
    const c = compareToTarget("2026-01-15", "2026-01-20");
    expect(c).toEqual({ slackDays: 5, onTime: true });
  });
  it("reports overrun when past target", () => {
    const c = compareToTarget("2026-01-25", "2026-01-20");
    expect(c?.slackDays).toBe(-5);
    expect(c?.onTime).toBe(false);
  });
  it("returns null when there is no end date", () => {
    expect(compareToTarget(null, "2026-01-20")).toBeNull();
  });
});

describe("effective capacity", () => {
  it("multiplies devs × hours × utilisation", () => {
    expect(
      effectiveHoursPerWeek({ devs: 3, hoursPerWeekPerDev: 40, utilizationPct: 50 })
    ).toBe(60);
  });
});

describe("delivery risk (live velocity)", () => {
  it("computes velocity per week from completed hours over elapsed days", () => {
    expect(velocityPerWeek(40, 14)).toBe(20); // 40h in 2 weeks
    expect(velocityPerWeek(40, 0)).toBe(0);
  });

  it("computes required velocity to hit a target", () => {
    expect(requiredVelocityPerWeek(60, "2026-01-01", "2026-01-22")).toBe(20); // 3 weeks
    expect(requiredVelocityPerWeek(10, "2026-01-22", "2026-01-01")).toBe(Infinity);
    expect(requiredVelocityPerWeek(0, "2026-01-22", "2026-01-01")).toBe(0);
  });

  it("projects completion from velocity", () => {
    const p = projectFromVelocity(40, 20, "2026-01-01"); // 2 weeks
    expect(p.endDate).toBe("2026-01-15");
  });

  it("gives ~50% when exactly on pace, higher when ahead, lower when behind", () => {
    expect(onTimeProbability(20, 20)).toBe(50);
    expect(onTimeProbability(30, 20)).toBeGreaterThan(80);
    expect(onTimeProbability(10, 20)).toBeLessThan(20);
    expect(onTimeProbability(5, Infinity)).toBe(0);
    expect(onTimeProbability(0, 20)).toBe(0);
  });

  it("maps probability to RAG against the threshold", () => {
    expect(rag(90)).toBe("green");
    expect(rag(60)).toBe("amber");
    expect(rag(40)).toBe("red");
    expect(rag(80, 85)).toBe("amber");
  });
});
