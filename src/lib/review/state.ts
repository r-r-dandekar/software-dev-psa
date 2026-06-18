/**
 * Review Workflow — pure state machine (D7, D19).
 *
 * This is the reusable Human-Override primitive shared by every module. It is
 * intentionally free of I/O so it can be unit-tested in isolation; the
 * orchestrator (workflow.ts) wires it to the Artifact Store and Event Bus.
 */

export type ReviewStatus =
  | "generated"
  | "under_review"
  | "approved"
  | "rejected";

export type ReviewAction =
  | "submit" // generated -> under_review
  | "approve" // under_review -> approved
  | "reject" // under_review -> rejected
  | "regenerate"; // (generated|rejected) -> generated (new draft)

export type AppRole = "developer" | "pm" | "sales" | "admin";

const TRANSITIONS: Record<ReviewAction, { from: ReviewStatus[]; to: ReviewStatus }> = {
  submit: { from: ["generated", "rejected"], to: "under_review" },
  approve: { from: ["under_review"], to: "approved" },
  reject: { from: ["under_review"], to: "rejected" },
  regenerate: { from: ["generated", "rejected", "under_review"], to: "generated" },
};

export type EvaluateResult =
  | { ok: true; next: ReviewStatus }
  | { ok: false; reason: string };

/**
 * Decide whether `action` is allowed from `current`, given the actor's roles.
 *
 * @param requiredRoles Roles permitted to perform gated actions for this
 *   artifact type (e.g. approve/reject a PRD). An empty list means the action
 *   is not role-gated. Admins always pass.
 */
export function evaluate(
  current: ReviewStatus,
  action: ReviewAction,
  actorRoles: readonly AppRole[],
  requiredRoles: readonly AppRole[] = []
): EvaluateResult {
  const rule = TRANSITIONS[action];
  if (!rule) {
    return { ok: false, reason: `Unknown action: ${action}` };
  }
  if (!rule.from.includes(current)) {
    return {
      ok: false,
      reason: `Cannot ${action} an artifact in status "${current}"`,
    };
  }
  if (isGated(action) && !hasRequiredRole(actorRoles, requiredRoles)) {
    return {
      ok: false,
      reason: `Action "${action}" requires one of roles: ${requiredRoles.join(", ")}`,
    };
  }
  return { ok: true, next: rule.to };
}

/** Approvals and rejections are the role-gated actions (D19). */
function isGated(action: ReviewAction): boolean {
  return action === "approve" || action === "reject";
}

function hasRequiredRole(
  actorRoles: readonly AppRole[],
  requiredRoles: readonly AppRole[]
): boolean {
  if (actorRoles.includes("admin")) return true; // admin override
  if (requiredRoles.length === 0) return true; // not gated
  return requiredRoles.some((r) => actorRoles.includes(r));
}

/** True once an artifact has been approved and may be locked (D7). */
export function canLock(status: ReviewStatus): boolean {
  return status === "approved";
}
