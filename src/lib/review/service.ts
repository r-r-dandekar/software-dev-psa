import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { emitEvent } from "@/lib/events/bus";
import { notifyUsers } from "@/lib/notifications/repo";
import { getArtifact, setReviewStatus, lockArtifact } from "@/lib/artifacts/store";
import {
  performReviewAction,
  performLock,
  type ReviewDeps,
  type ActionResult,
} from "./workflow";
import type { ReviewAction, AppRole } from "./state";

/** Which roles may approve/reject (and lock) each artifact type (D10/D19). */
const APPROVER_ROLES: Record<string, AppRole[]> = {
  prd: ["pm", "admin"],
  estimate: ["pm", "admin"],
};

function requiredApprovers(type: string): AppRole[] {
  return APPROVER_ROLES[type] ?? [];
}

async function listApprovers(type: string): Promise<string[]> {
  const roles = requiredApprovers(type);
  if (roles.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .overlaps("roles", roles);
  return ((data as { id: string }[]) ?? []).map((p) => p.id);
}

function buildDeps(): ReviewDeps {
  return {
    async getArtifact(id) {
      const a = await getArtifact(id);
      if (!a) return null;
      return {
        id: a.id,
        type: a.type,
        project_id: a.project_id,
        review_status: a.review_status,
        locked_at: a.locked_at,
      };
    },
    setReviewStatus,
    lockArtifact,
    async emitEvent(e) {
      await emitEvent({
        type: e.type,
        artifactId: e.artifactId,
        projectId: e.projectId,
        actorId: e.actorId,
        payload: e.payload,
      });
    },
    async notify(userIds, n) {
      await notifyUsers(userIds, n);
    },
    requiredApprovers,
    listApprovers,
  };
}

export async function performReviewActionForCurrentUser(
  artifactId: string,
  action: ReviewAction
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, reason: "Not authenticated" };
  return performReviewAction(buildDeps(), {
    artifactId,
    action,
    actor: { id: profile.id, roles: profile.roles },
  });
}

export async function lockArtifactForCurrentUser(
  artifactId: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, reason: "Not authenticated" };
  return performLock(buildDeps(), {
    artifactId,
    actor: { id: profile.id, roles: profile.roles },
  });
}
