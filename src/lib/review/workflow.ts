/**
 * Review Workflow orchestrator (D7). Wraps the pure state machine (state.ts)
 * with side effects expressed as injected ports, so it can be unit-tested with
 * in-memory fakes. The Supabase-backed wiring lives in service.ts.
 */
import {
  evaluate,
  canLock,
  type ReviewAction,
  type ReviewStatus,
  type AppRole,
} from "./state";

export type Actor = { id: string; roles: AppRole[] };

export type ArtifactRef = {
  id: string;
  type: string;
  project_id: string;
  review_status: ReviewStatus;
  locked_at: string | null;
};

export interface ReviewDeps {
  getArtifact(id: string): Promise<ArtifactRef | null>;
  setReviewStatus(id: string, status: ReviewStatus): Promise<void>;
  lockArtifact(id: string): Promise<void>;
  emitEvent(e: {
    type: string;
    artifactId: string;
    projectId: string;
    actorId: string;
    payload?: Record<string, unknown>;
  }): Promise<void>;
  notify(
    userIds: string[],
    n: { type: string; title: string; body?: string; link?: string }
  ): Promise<void>;
  /** Roles permitted to approve/reject this artifact type (D10/D19). */
  requiredApprovers(type: string): AppRole[];
  /** Users to notify when an artifact enters review (the approvers). */
  listApprovers(type: string): Promise<string[]>;
}

export type ActionResult =
  | { ok: true; status: ReviewStatus }
  | { ok: false; reason: string };

export async function performReviewAction(
  deps: ReviewDeps,
  input: { artifactId: string; action: ReviewAction; actor: Actor }
): Promise<ActionResult> {
  const { artifactId, action, actor } = input;
  const artifact = await deps.getArtifact(artifactId);
  if (!artifact) return { ok: false, reason: "Artifact not found" };
  if (artifact.locked_at) {
    return { ok: false, reason: "Artifact is locked and cannot be changed" };
  }

  const decision = evaluate(
    artifact.review_status,
    action,
    actor.roles,
    deps.requiredApprovers(artifact.type)
  );
  if (!decision.ok) return decision;

  await deps.setReviewStatus(artifactId, decision.next);
  await deps.emitEvent({
    type: `artifact.${action}`,
    artifactId,
    projectId: artifact.project_id,
    actorId: actor.id,
  });

  // Notifications (S5): on submit, alert approvers; on decision, alert author.
  if (action === "submit") {
    const approvers = await deps.listApprovers(artifact.type);
    await deps.notify(approvers, {
      type: "review_requested",
      title: "Review requested",
      body: `A ${artifact.type.toUpperCase()} is awaiting your review.`,
      link: `/reviews`,
    });
  }

  return { ok: true, status: decision.next };
}

export async function performLock(
  deps: ReviewDeps,
  input: { artifactId: string; actor: Actor }
): Promise<ActionResult> {
  const { artifactId, actor } = input;
  const artifact = await deps.getArtifact(artifactId);
  if (!artifact) return { ok: false, reason: "Artifact not found" };
  if (artifact.locked_at) return { ok: false, reason: "Already locked" };
  if (!canLock(artifact.review_status)) {
    return { ok: false, reason: "Only approved artifacts can be locked" };
  }
  // Locking is gated to the same roles that approve.
  const required = deps.requiredApprovers(artifact.type);
  const allowed =
    actor.roles.includes("admin") ||
    required.length === 0 ||
    required.some((r) => actor.roles.includes(r));
  if (!allowed) {
    return { ok: false, reason: `Locking requires one of: ${required.join(", ")}` };
  }

  await deps.lockArtifact(artifactId);
  await deps.emitEvent({
    type: "artifact.locked",
    artifactId,
    projectId: artifact.project_id,
    actorId: actor.id,
  });
  return { ok: true, status: artifact.review_status };
}
