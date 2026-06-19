import { inngest } from "./client";
import { runWithDb, getDb } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { reindexAll } from "@/lib/kb/index-service";
import { syncProject } from "@/lib/delivery/sync";
import { computeRisk, RISK_THRESHOLD } from "@/lib/delivery/risk";
import { generateStatusReport } from "@/lib/reports/service";
import { notifyUsers } from "@/lib/notifications/repo";
import { emitEvent } from "@/lib/events/bus";

/**
 * Scheduled background jobs (the deferred "background-work pass"). Each runs
 * with service-role access via runWithDb(adminClient, ...) so the existing
 * request-scoped repos work without a session (D6/D15).
 */

async function approverIds(): Promise<string[]> {
  const db = await getDb();
  const { data } = await db
    .from("profiles")
    .select("id")
    .overlaps("roles", ["pm", "admin"]);
  return ((data as { id: string }[]) ?? []).map((p) => p.id);
}

/** Nightly: re-embed the artifact corpus into the KB. */
export const nightlyReindex = inngest.createFunction(
  { id: "kb-nightly-reindex", triggers: [{ cron: "0 2 * * *" }] },
  async () => runWithDb(createAdminClient(), async () => reindexAll())
);

/** Daily: sync Linear status for every linked project + proactive at-risk alert. */
export const dailyDeliverySync = inngest.createFunction(
  { id: "delivery-daily-sync", triggers: [{ cron: "0 6 * * *" }] },
  async () =>
    runWithDb(createAdminClient(), async () => {
      const db = await getDb();
      const { data } = await db
        .from("project_integrations")
        .select("project_id")
        .not("linear_team_id", "is", null);
      const projects = (data as { project_id: string }[]) ?? [];

      let alerts = 0;
      for (const { project_id } of projects) {
        try {
          await syncProject(project_id);
          const risk = await computeRisk(project_id);
          if (risk.probability !== null && risk.probability < RISK_THRESHOLD) {
            await notifyUsers(await approverIds(), {
              type: "milestone_at_risk",
              title: "Delivery at risk",
              body: `On-time probability ${risk.probability}% (below ${RISK_THRESHOLD}%).`,
              link: `/projects/${project_id}/delivery`,
            });
            await emitEvent({
              type: "milestone.at_risk",
              projectId: project_id,
              payload: { probability: risk.probability },
            });
            alerts += 1;
          }
        } catch {
          // skip a project that fails (e.g. transient API error); others continue
        }
      }
      return { projects: projects.length, alerts };
    })
);

/** Weekly (Fri): draft a status report for every project with a linked repo. */
export const weeklyStatusReports = inngest.createFunction(
  { id: "status-weekly-reports", triggers: [{ cron: "0 8 * * 5" }] },
  async () =>
    runWithDb(createAdminClient(), async () => {
      const db = await getDb();
      const { data } = await db
        .from("project_integrations")
        .select("project_id")
        .not("github_repo", "is", null);
      const projects = (data as { project_id: string }[]) ?? [];

      let drafted = 0;
      for (const { project_id } of projects) {
        try {
          await generateStatusReport(project_id, null);
          drafted += 1;
        } catch {
          // continue with other projects
        }
      }
      return { drafted };
    })
);

/** Weekly (Mon): digest of KB knowledge gaps + flagged answers to the leads. */
export const weeklyKnowledgeGapDigest = inngest.createFunction(
  { id: "kb-weekly-gap-digest", triggers: [{ cron: "0 8 * * 1" }] },
  async () =>
    runWithDb(createAdminClient(), async () => {
      const db = await getDb();
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data } = await db
        .from("kb_queries")
        .select("question, is_gap, helpful")
        .gte("created_at", since);
      const rows = (data as { question: string; is_gap: boolean; helpful: boolean | null }[]) ?? [];
      const gaps = rows.filter((r) => r.is_gap || r.helpful === false);
      if (gaps.length === 0) return { gaps: 0 };

      await notifyUsers(await approverIds(), {
        type: "kb_gap_digest",
        title: `${gaps.length} knowledge gap(s) this week`,
        body: "Questions without a good documented answer — consider documenting them.",
        link: "/knowledge",
      });
      return { gaps: gaps.length };
    })
);

export const functions = [
  nightlyReindex,
  dailyDeliverySync,
  weeklyStatusReports,
  weeklyKnowledgeGapDigest,
];
