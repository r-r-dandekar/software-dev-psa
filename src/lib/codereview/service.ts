import "server-only";
import { getProject } from "@/lib/projects/repo";
import { getOrCreateIntegration } from "@/lib/delivery/repo";
import { createGitHubConnector } from "@/lib/connectors/github";
import { createArtifactWithVersion } from "@/lib/artifacts/store";
import { emitEvent } from "@/lib/events/bus";
import { getDb } from "@/lib/supabase/context";
import { generateReview } from "./generate";
import { buildReviewContent, buildReviewPayload, countsBySeverity, type CodeReviewResult } from "./render";
import type { Artifact, CodeReviewSettings } from "@/lib/db/types";

/** Run an AI review of a PR in the project's linked repo, store as an artifact. */
export async function reviewPullRequest(
  projectId: string,
  prNumber: number,
  createdBy: string | null
): Promise<{ artifact: Artifact; result: CodeReviewResult; headSha: string }> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const integration = await getOrCreateIntegration(projectId);
  if (!integration.github_owner || !integration.github_repo) {
    throw new Error("Link a GitHub repo first (Status tab)");
  }

  const [pr, settings] = await Promise.all([
    createGitHubConnector().getPullRequest(integration.github_owner, integration.github_repo, prNumber),
    getReviewSettings(projectId),
  ]);

  const rawResult = await generateReview({
    prTitle: pr.title,
    prBody: pr.body,
    diff: pr.diff,
    techStack: project.tech_stack,
    enabledDimensions: settings?.enabled_dimensions,
  });
  const result = applySkipPaths(rawResult, settings?.skip_paths ?? []);

  const content = buildReviewContent(result, prNumber);
  const artifact = await createArtifactWithVersion({
    projectId,
    type: "code_review",
    title: `Review PR #${prNumber} — ${pr.title}`,
    sourceModule: "code-review",
    content,
    createdBy,
  });

  const counts = countsBySeverity(result.findings);
  await emitEvent({
    type: "review.completed",
    artifactId: artifact.id,
    projectId,
    actorId: createdBy,
    payload: { prNumber, verdict: result.verdict, ...counts },
  });

  return { artifact, result, headSha: pr.headSha };
}

async function getReviewSettings(projectId: string): Promise<CodeReviewSettings | null> {
  const db = await getDb();
  const { data } = await db
    .from("code_review_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  return (data as CodeReviewSettings | null);
}

function applySkipPaths(result: CodeReviewResult, skipPaths: string[]): CodeReviewResult {
  if (skipPaths.length === 0) return result;
  const findings = result.findings.filter(
    (f) => !skipPaths.some((p) => f.file.startsWith(p))
  );
  const hasBlocking = findings.some((f) => f.severity === "blocking");
  return {
    ...result,
    verdict: hasBlocking ? "request_changes" : "approve",
    findings,
  };
}

/** Find the project linked to a GitHub repo (for the webhook). */
export async function findProjectIdByRepo(
  owner: string,
  repo: string
): Promise<string | null> {
  const db = await getDb();
  const { data } = await db
    .from("project_integrations")
    .select("project_id")
    .eq("github_owner", owner)
    .eq("github_repo", repo)
    .maybeSingle();
  return (data as { project_id: string } | null)?.project_id ?? null;
}

/** Webhook path: review a PR and post inline findings as a GitHub PR Review. */
export async function reviewAndComment(
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ reviewed: boolean }> {
  const projectId = await findProjectIdByRepo(owner, repo);
  if (!projectId) return { reviewed: false }; // repo not linked to a project

  const github = createGitHubConnector();
  const { result, headSha } = await reviewPullRequest(projectId, prNumber, null);

  const { summaryBody, event, inlineComments } = buildReviewPayload(result, prNumber);
  await github.postPullRequestReview(owner, repo, prNumber, headSha, event, summaryBody, inlineComments);
  return { reviewed: true };
}
