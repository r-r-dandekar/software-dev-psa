import { describe, it, expect } from "vitest";
import {
  isInterviewReady,
  openCount,
  buildDigest,
  DEFAULT_DIMENSIONS,
} from "@/lib/prd/interview-core";

describe("prd interview core", () => {
  it("is not ready while any dimension is open", () => {
    expect(
      isInterviewReady([{ state: "resolved" }, { state: "open" }])
    ).toBe(false);
    expect(openCount([{ state: "resolved" }, { state: "open" }])).toBe(1);
  });

  it("is ready when all dimensions are resolved/deferred/na", () => {
    expect(
      isInterviewReady([
        { state: "resolved" },
        { state: "deferred" },
        { state: "na" },
      ])
    ).toBe(true);
  });

  it("is not ready with no dimensions", () => {
    expect(isInterviewReady([])).toBe(false);
  });

  it("ships the 8-dimension floor", () => {
    expect(DEFAULT_DIMENSIONS).toHaveLength(8);
    expect(DEFAULT_DIMENSIONS[0].key).toBe("goal");
  });

  it("builds a digest with requirements and decisions, flagging deferrals", () => {
    const digest = buildDigest({
      requirements: [{ heading: "Login", description: "email + password" }],
      dimensions: [
        { label: "Goal", state: "resolved", note: "Reduce signups friction" },
        { label: "Payments", state: "deferred", note: "provider TBD" },
        { label: "i18n", state: "na", note: null },
      ],
    });
    expect(digest).toContain("- Login: email + password");
    expect(digest).toContain("Goal — RESOLVED: Reduce signups friction");
    expect(digest).toContain("Payments — DEFERRED (treat as an Open Question): provider TBD");
    expect(digest).toContain("i18n — NOT APPLICABLE");
  });
});
