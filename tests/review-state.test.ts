import { describe, it, expect } from "vitest";
import { evaluate, canLock } from "@/lib/review/state";

const PRD_APPROVERS = ["pm", "admin"] as const;

describe("review state machine", () => {
  it("submits a generated artifact for review (any role)", () => {
    expect(evaluate("generated", "submit", ["developer"])).toEqual({
      ok: true,
      next: "under_review",
    });
  });

  it("rejects illegal transitions", () => {
    // cannot approve something that isn't under review
    const r = evaluate("generated", "approve", ["pm"], PRD_APPROVERS);
    expect(r.ok).toBe(false);
  });

  it("allows an approver to approve an under_review artifact", () => {
    expect(
      evaluate("under_review", "approve", ["pm"], PRD_APPROVERS)
    ).toEqual({ ok: true, next: "approved" });
  });

  it("blocks approval by a role without permission", () => {
    const r = evaluate("under_review", "approve", ["developer"], PRD_APPROVERS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/requires one of roles/);
  });

  it("lets an admin approve regardless of required roles (override)", () => {
    expect(
      evaluate("under_review", "approve", ["admin"], PRD_APPROVERS)
    ).toEqual({ ok: true, next: "approved" });
  });

  it("supports reject and re-submit cycle", () => {
    expect(evaluate("under_review", "reject", ["pm"], PRD_APPROVERS).ok).toBe(true);
    // a rejected artifact can be resubmitted
    expect(evaluate("rejected", "submit", ["developer"]).ok).toBe(true);
  });

  it("can regenerate from any non-approved state back to a fresh draft", () => {
    expect(evaluate("rejected", "regenerate", ["developer"])).toEqual({
      ok: true,
      next: "generated",
    });
    expect(evaluate("under_review", "regenerate", ["developer"]).ok).toBe(true);
  });

  it("treats ungated actions as role-agnostic", () => {
    expect(evaluate("generated", "submit", []).ok).toBe(true);
  });

  it("only allows locking once approved", () => {
    expect(canLock("approved")).toBe(true);
    expect(canLock("under_review")).toBe(false);
    expect(canLock("generated")).toBe(false);
  });
});
