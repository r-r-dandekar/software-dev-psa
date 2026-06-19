import "server-only";
import { getProject } from "@/lib/projects/repo";
import { listRequirements } from "@/lib/requirements/repo";
import {
  getProjectArtifactByType,
  createArtifactWithVersion,
  addVersion,
  setReviewStatus,
} from "@/lib/artifacts/store";
import { emitEvent } from "@/lib/events/bus";
import { generatePrdContentFromDigest } from "./generate";
import { runInterviewTurn, type InterviewTurn } from "./interview-engine";
import { isInterviewReady, buildDigest } from "./interview-core";
import {
  getInterview,
  createInterview,
  setInterviewStatus,
  getDimensions,
  getMessages,
  appendMessage,
  upsertDimension,
  setDimensionState,
} from "./interview-repo";
import type {
  PrdInterview,
  PrdInterviewMessage,
  PrdInterviewDimension,
  Artifact,
} from "@/lib/db/types";

export type InterviewState = {
  interview: PrdInterview;
  messages: PrdInterviewMessage[];
  dimensions: PrdInterviewDimension[];
};

async function loadState(interview: PrdInterview): Promise<InterviewState> {
  const [messages, dimensions] = await Promise.all([
    getMessages(interview.id),
    getDimensions(interview.id),
  ]);
  return { interview, messages, dimensions };
}

async function applyTurn(
  interviewId: string,
  turn: InterviewTurn,
  assistantSeq: number
): Promise<void> {
  for (const du of turn.dimension_updates) {
    await upsertDimension({
      interviewId,
      key: du.key,
      label: du.label,
      state: du.state,
      note: du.note,
    });
  }
  for (const nd of turn.new_dimensions) {
    await upsertDimension({
      interviewId,
      key: nd.key,
      label: nd.label,
      state: "open",
      isCustom: true,
    });
  }
  await appendMessage({
    interviewId,
    role: "assistant",
    content: turn.assistant_message,
    payload: {
      recommended: turn.recommended_answer ?? undefined,
      options: turn.options,
    },
    seq: assistantSeq,
  });

  const dims = await getDimensions(interviewId);
  await setInterviewStatus(interviewId, isInterviewReady(dims) ? "ready" : "in_progress");
}

function reqLikes(reqs: { heading: string; description: string | null }[]) {
  return reqs.map((r) => ({ heading: r.heading, description: r.description }));
}

/** Start the interview or return the existing one. The first question is
 *  produced by processPendingTurn so a failed AI call leaves a resumable state. */
export async function startOrGetInterview(projectId: string): Promise<InterviewState> {
  const existing = await getInterview(projectId);
  if (!existing) await createInterview(projectId);
  return processPendingTurn(projectId);
}

export async function getInterviewState(
  projectId: string
): Promise<InterviewState | null> {
  const interview = await getInterview(projectId);
  return interview ? loadState(interview) : null;
}

/**
 * Produce the next assistant turn when one is pending — i.e. when the interview
 * has no messages yet (needs its first question) or the last message is from
 * the user (their answer hasn't been processed). Safe to call repeatedly: if
 * the last message is already an assistant turn, it's a no-op. This is what
 * makes the interview resume seamlessly after an interruption (e.g. a rate
 * limit) — the user's answer is committed before the AI call, so a retry just
 * re-runs this.
 */
export async function processPendingTurn(projectId: string): Promise<InterviewState> {
  const interview = await getInterview(projectId);
  if (!interview) throw new Error("No interview in progress");

  const messages = await getMessages(interview.id);
  const last = messages[messages.length - 1];
  if (last && last.role === "assistant") return loadState(interview); // nothing pending

  const [requirements, dimensions] = await Promise.all([
    listRequirements(projectId),
    getDimensions(interview.id),
  ]);

  const turn = await runInterviewTurn({
    requirements: reqLikes(requirements),
    dimensions: dimensions.map((d) => ({
      key: d.key,
      label: d.label,
      state: d.state,
      note: d.note,
    })),
    recentMessages: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    userMessage: last?.content ?? "",
  });
  await applyTurn(interview.id, turn, messages.length);
  return loadState(interview);
}

/** Commit the user's answer, then process the AI turn. If the AI call fails,
 *  the answer is already saved and processPendingTurn can finish it on resume. */
export async function sendInterviewMessage(
  projectId: string,
  text: string
): Promise<InterviewState> {
  const interview = await getInterview(projectId);
  if (!interview) throw new Error("No interview in progress");
  const messages = await getMessages(interview.id);
  await appendMessage({
    interviewId: interview.id,
    role: "user",
    content: text,
    seq: messages.length,
  });
  return processPendingTurn(projectId);
}

export async function deferDimension(
  projectId: string,
  key: string,
  reason: string
): Promise<void> {
  const interview = await getInterview(projectId);
  if (!interview) return;
  await setDimensionState(interview.id, key, "deferred", reason);
  const dims = await getDimensions(interview.id);
  await setInterviewStatus(interview.id, isInterviewReady(dims) ? "ready" : "in_progress");
}

export async function revisitDimension(projectId: string, key: string): Promise<void> {
  const interview = await getInterview(projectId);
  if (!interview) return;
  await setDimensionState(interview.id, key, "open");
  await setInterviewStatus(interview.id, "in_progress");
}

/** Generate (or regenerate) the PRD from the interview digest. */
export async function generatePrdFromInterview(
  projectId: string,
  createdBy: string
): Promise<Artifact> {
  const interview = await getInterview(projectId);
  if (!interview) throw new Error("No interview");
  const dimensions = await getDimensions(interview.id);
  if (!isInterviewReady(dimensions)) {
    throw new Error("Interview is not complete yet");
  }

  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");
  const requirements = await listRequirements(projectId);

  const digest = buildDigest({
    requirements: reqLikes(requirements),
    dimensions: dimensions.map((d) => ({ label: d.label, state: d.state, note: d.note })),
  });
  const content = await generatePrdContentFromDigest(project, digest);

  const existing = await getProjectArtifactByType(projectId, "prd");
  let artifact: Artifact;
  if (existing && !existing.locked_at) {
    await addVersion({ artifactId: existing.id, content, createdBy });
    await setReviewStatus(existing.id, "generated");
    artifact = existing;
  } else {
    artifact = await createArtifactWithVersion({
      projectId,
      type: "prd",
      title: `PRD — ${project.name}`,
      sourceModule: "prd-generation",
      content,
      createdBy,
    });
  }

  await setInterviewStatus(interview.id, "generated");
  await emitEvent({ type: "prd.generated", artifactId: artifact.id, projectId, actorId: createdBy });
  return artifact;
}
