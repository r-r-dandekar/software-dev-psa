/**
 * Status-report activity aggregation — pure (no I/O), so the summarisation of
 * raw GitHub + task data is unit-tested in isolation. The AI drafts prose from
 * this normalised summary; the numbers are computed here.
 */
import type { TaskStatus } from "@/lib/db/types";

export type RawCommit = { message: string; author: string; date: string };
export type RawPR = {
  number: number;
  title: string;
  mergedAt: string | null;
  open: boolean;
};
export type TaskLite = { title: string; status: TaskStatus };

export type ActivitySummary = {
  commitCount: number;
  mergedPrCount: number;
  openPrCount: number;
  completedTasks: string[];
  inProgressTasks: string[];
  topCommitMessages: string[];
};

export function summarizeActivity(input: {
  commits: RawCommit[];
  prs: RawPR[];
  tasks: TaskLite[];
}): ActivitySummary {
  const { commits, prs, tasks } = input;

  const firstLines = commits.map((c) => c.message.split("\n")[0].trim());
  const topCommitMessages = [...new Set(firstLines)]
    .filter((m) => m.length > 0)
    .slice(0, 10);

  return {
    commitCount: commits.length,
    mergedPrCount: prs.filter((p) => p.mergedAt !== null).length,
    openPrCount: prs.filter((p) => p.open && p.mergedAt === null).length,
    completedTasks: tasks.filter((t) => t.status === "done").map((t) => t.title),
    inProgressTasks: tasks
      .filter((t) => t.status === "in_progress")
      .map((t) => t.title),
    topCommitMessages,
  };
}

/** Render the summary as a compact text block for the AI prompt. */
export function summaryToPromptBlock(s: ActivitySummary): string {
  return [
    `Commits this period: ${s.commitCount}`,
    `Merged PRs: ${s.mergedPrCount} · Open PRs: ${s.openPrCount}`,
    ``,
    `Notable commit messages:`,
    ...(s.topCommitMessages.length ? s.topCommitMessages.map((m) => `- ${m}`) : ["- (none)"]),
    ``,
    `Completed tasks:`,
    ...(s.completedTasks.length ? s.completedTasks.map((t) => `- ${t}`) : ["- (none)"]),
    ``,
    `In-progress tasks:`,
    ...(s.inProgressTasks.length ? s.inProgressTasks.map((t) => `- ${t}`) : ["- (none)"]),
  ].join("\n");
}
