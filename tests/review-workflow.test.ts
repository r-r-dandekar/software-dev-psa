import { describe, it, expect, beforeEach } from "vitest";
import {
  performReviewAction,
  performLock,
  type ReviewDeps,
  type ArtifactRef,
} from "@/lib/review/workflow";
import type { ReviewStatus } from "@/lib/review/state";

// In-memory fakes — let us test the orchestrator + event emission in isolation.
function makeDeps(initial: ArtifactRef) {
  const artifact = { ...initial };
  const events: { type: string; actorId: string }[] = [];
  const notified: { userIds: string[]; title: string }[] = [];

  const deps: ReviewDeps = {
    async getArtifact(id) {
      return id === artifact.id ? { ...artifact } : null;
    },
    async setReviewStatus(_id, status: ReviewStatus) {
      artifact.review_status = status;
    },
    async lockArtifact(_id) {
      artifact.locked_at = new Date().toISOString();
    },
    async emitEvent(e) {
      events.push({ type: e.type, actorId: e.actorId });
    },
    async notify(userIds, n) {
      notified.push({ userIds, title: n.title });
    },
    requiredApprovers() {
      return ["pm", "admin"];
    },
    async listApprovers() {
      return ["approver-1", "approver-2"];
    },
  };
  return { deps, artifact, events, notified };
}

const base: ArtifactRef = {
  id: "a1",
  type: "prd",
  project_id: "p1",
  review_status: "generated",
  locked_at: null,
};

describe("review workflow orchestrator", () => {
  let ctx: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    ctx = makeDeps({ ...base });
  });

  it("submits for review, sets status, emits event, notifies approvers", async () => {
    const r = await performReviewAction(ctx.deps, {
      artifactId: "a1",
      action: "submit",
      actor: { id: "dev", roles: ["developer"] },
    });
    expect(r).toEqual({ ok: true, status: "under_review" });
    expect(ctx.artifact.review_status).toBe("under_review");
    expect(ctx.events.map((e) => e.type)).toContain("artifact.submit");
    expect(ctx.notified[0].userIds).toEqual(["approver-1", "approver-2"]);
  });

  it("blocks approval by an unauthorized role and emits nothing", async () => {
    ctx.artifact.review_status = "under_review";
    const r = await performReviewAction(ctx.deps, {
      artifactId: "a1",
      action: "approve",
      actor: { id: "dev", roles: ["developer"] },
    });
    expect(r.ok).toBe(false);
    expect(ctx.events).toHaveLength(0);
    expect(ctx.artifact.review_status).toBe("under_review");
  });

  it("lets a PM approve", async () => {
    ctx.artifact.review_status = "under_review";
    const r = await performReviewAction(ctx.deps, {
      artifactId: "a1",
      action: "approve",
      actor: { id: "pm1", roles: ["pm"] },
    });
    expect(r).toEqual({ ok: true, status: "approved" });
    expect(ctx.events.map((e) => e.type)).toContain("artifact.approve");
  });

  it("locks only an approved artifact, by an authorized role", async () => {
    ctx.artifact.review_status = "approved";
    const denied = await performLock(ctx.deps, {
      artifactId: "a1",
      actor: { id: "dev", roles: ["developer"] },
    });
    expect(denied.ok).toBe(false);

    const ok = await performLock(ctx.deps, {
      artifactId: "a1",
      actor: { id: "admin", roles: ["admin"] },
    });
    expect(ok.ok).toBe(true);
    expect(ctx.artifact.locked_at).not.toBeNull();
    expect(ctx.events.map((e) => e.type)).toContain("artifact.locked");
  });

  it("refuses any action on a locked artifact", async () => {
    ctx.artifact.review_status = "approved";
    ctx.artifact.locked_at = new Date().toISOString();
    const r = await performReviewAction(ctx.deps, {
      artifactId: "a1",
      action: "regenerate",
      actor: { id: "admin", roles: ["admin"] },
    });
    expect(r.ok).toBe(false);
  });
});
