import "server-only";
import { createLinearConnector } from "@/lib/connectors/linear";
import { listTasks } from "@/lib/estimation/repo";
import {
  getOrCreateIntegration,
  updateIntegration,
  setTaskSync,
  upsertSnapshot,
} from "./repo";
import type { Task } from "@/lib/db/types";

function weight(t: Task): number {
  return (Number(t.min_hours) + Number(t.max_hours)) / 2;
}

/** Create Linear issues for any tasks that don't have one yet (D11 push). */
export async function pushTasksToLinear(projectId: string): Promise<number> {
  const integration = await getOrCreateIntegration(projectId);
  if (!integration.linear_team_id) throw new Error("Link a Linear team first");

  const connector = createLinearConnector();
  const tasks = await listTasks(projectId);
  let pushed = 0;
  for (const t of tasks) {
    if (t.external_id) continue;
    const issue = await connector.createIssue({
      teamId: integration.linear_team_id,
      title: t.title,
      description: `Discipline: ${t.discipline} · Estimate ${t.min_hours}–${t.max_hours}h (uncertainty: ${t.uncertainty})`,
    });
    await setTaskSync(t.id, { external_id: issue.id, external_key: issue.key });
    pushed += 1;
  }
  return pushed;
}

/** Pull Linear issue states into tasks and snapshot velocity (D4 sync). */
export async function syncProject(projectId: string): Promise<{
  updated: number;
  done: number;
}> {
  const integration = await getOrCreateIntegration(projectId);
  if (!integration.linear_team_id) throw new Error("Link a Linear team first");

  const connector = createLinearConnector();
  const issues = await connector.listTeamIssues(integration.linear_team_id);
  const byId = new Map(issues.map((i) => [i.id, i]));

  const tasks = await listTasks(projectId);
  let updated = 0;
  for (const t of tasks) {
    if (!t.external_id) continue;
    const issue = byId.get(t.external_id);
    if (!issue) continue;
    await setTaskSync(t.id, {
      status: issue.status,
      completed_at: issue.completedAt,
    });
    updated += 1;
  }

  // Snapshot velocity from the freshly-synced tasks.
  const after = await listTasks(projectId);
  const active = after.filter((t) => t.status !== "canceled");
  const doneTasks = active.filter((t) => t.status === "done");
  await upsertSnapshot(projectId, {
    completed_hours: doneTasks.reduce((s, t) => s + weight(t), 0),
    total_hours: active.reduce((s, t) => s + weight(t), 0),
    done_count: doneTasks.length,
    total_count: active.length,
  });

  await updateIntegration(projectId, { last_synced_at: new Date().toISOString() });
  return { updated, done: doneTasks.length };
}
