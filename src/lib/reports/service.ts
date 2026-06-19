import "server-only";
import { getProject } from "@/lib/projects/repo";
import { listTasks } from "@/lib/estimation/repo";
import { getOrCreateIntegration } from "@/lib/delivery/repo";
import { computeRisk } from "@/lib/delivery/risk";
import { createGitHubConnector } from "@/lib/connectors/github";
import { createArtifactWithVersion } from "@/lib/artifacts/store";
import { emitEvent } from "@/lib/events/bus";
import { summarizeActivity, summaryToPromptBlock, type TaskLite } from "./activity";
import { generateReportContent } from "./generate";
import { getOrCreateReportSettings } from "./repo";
import type { Artifact } from "@/lib/db/types";

const WINDOW_DAYS = 7;

export async function generateStatusReport(
  projectId: string,
  createdBy: string | null
): Promise<Artifact> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const integration = await getOrCreateIntegration(projectId);
  if (!integration.github_owner || !integration.github_repo) {
    throw new Error("Link a GitHub repo first");
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const activity = await createGitHubConnector().getActivity(
    integration.github_owner,
    integration.github_repo,
    since
  );

  const tasks = await listTasks(projectId);
  const taskLites: TaskLite[] = tasks.map((t) => ({ title: t.title, status: t.status }));
  const summary = summarizeActivity({
    commits: activity.commits,
    prs: activity.prs,
    tasks: taskLites,
  });

  const settings = await getOrCreateReportSettings(projectId);
  let ragHint: string | null = null;
  try {
    const risk = await computeRisk(projectId);
    ragHint = risk.rag;
  } catch {
    // risk is optional context
  }

  const periodLabel = `${new Date(since).toLocaleDateString()} – ${new Date().toLocaleDateString()}`;
  const content = await generateReportContent({
    projectName: project.name,
    clientName: project.client?.name ?? "the client",
    periodLabel,
    activityBlock: summaryToPromptBlock(summary),
    profile: {
      tone: settings.tone,
      formality: settings.formality,
      notes: settings.notes,
      ragHint,
    },
  });

  const artifact = await createArtifactWithVersion({
    projectId,
    type: "status_report",
    title: `Status Report — ${project.name} — ${new Date().toLocaleDateString()}`,
    sourceModule: "status-report",
    content,
    createdBy,
  });

  await emitEvent({
    type: "status_report.generated",
    artifactId: artifact.id,
    projectId,
    actorId: createdBy,
  });

  return artifact;
}
