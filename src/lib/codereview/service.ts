import "server-only";
import { getProject } from "@/lib/projects/repo";
import { getOrCreateIntegration } from "@/lib/delivery/repo";
import { createGitHubConnector } from "@/lib/connectors/github";
import { createArtifactWithVersion } from "@/lib/artifacts/store";
import { emitEvent } from "@/lib/events/bus";
import { generateReview } from "./generate";
import { buildReviewContent, countsBySeverity } from "./render";
import type { Artifact } from "@/lib/db/types";

/** Run an AI review of a PR in the project's linked repo, store as an artifact. */
export async function reviewPullRequest(
  projectId: string,
  prNumber: number,
  createdBy: string
): Promise<Artifact> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const integration = await getOrCreateIntegration(projectId);
  if (!integration.github_owner || !integration.github_repo) {
    throw new Error("Link a GitHub repo first (Status tab)");
  }

  const pr = await createGitHubConnector().getPullRequest(
    integration.github_owner,
    integration.github_repo,
    prNumber
  );

  const result = await generateReview({
    prTitle: pr.title,
    prBody: pr.body,
    diff: pr.diff,
    techStack: project.tech_stack,
  });

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

  return artifact;
}
