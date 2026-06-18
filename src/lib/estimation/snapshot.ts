import "server-only";
import type { ArtifactContent } from "@/lib/artifacts/content";
import {
  createArtifactWithVersion,
  addVersion,
  getProjectArtifactByType,
  setReviewStatus,
} from "@/lib/artifacts/store";
import { computeEstimate, DISCIPLINES, type EngineTask, type EstimateSettings } from "./engine";
import { getOrCreateSettings, listTasks, toEngineTask, toEngineSettings } from "./repo";

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

const h = (n: number) => `${Math.round(n * 10) / 10}h`;

/** Render the computed estimate into a sectioned snapshot for review/print. */
export function buildEstimateContent(
  tasks: EngineTask[],
  settings: EstimateSettings
): ArtifactContent {
  const r = computeEstimate(tasks, settings);
  const cur = settings.currency;

  const summary = [
    `**Total effort:** ${h(r.totals.min)}–${h(r.totals.max)} (expected ${h(r.totals.expected)})`,
    `**Confidence:** ${r.confidenceScore}/100 (${r.confidenceLabel})`,
    ``,
    `| Discipline | Min | Max | Expected |`,
    `|---|---|---|---|`,
    ...DISCIPLINES.map(
      (d) =>
        `| ${d} | ${h(r.byDiscipline[d].min)} | ${h(r.byDiscipline[d].max)} | ${h(r.byDiscipline[d].expected)} |`
    ),
  ].join("\n");

  const breakdown = [
    `| Task | Discipline | Min | Max | Uncertainty |`,
    `|---|---|---|---|---|`,
    ...tasks.map(
      (t) =>
        `| ${t.title} | ${t.discipline} | ${h(t.minHours)} | ${h(t.maxHours)} | ${t.uncertainty} |`
    ),
  ].join("\n");

  const quote = [
    `**Quote range: ${money(r.quote.quoteMin, cur)} – ${money(r.quote.quoteMax, cur)}**`,
    ``,
    `- Day rate: ${money(settings.dayRate, cur)} (${settings.hoursPerDay}h/day → ${money(r.quote.hourlyRate, cur)}/h)`,
    `- Contingency: ${settings.contingencyPct}% → ${h(r.quote.contingencyHours.min)}–${h(r.quote.contingencyHours.max)}`,
    `- Margin: ${settings.marginPct}%`,
  ].join("\n");

  const risks =
    r.risks.length === 0
      ? "No tasks yet."
      : r.risks
          .map((ri, i) => `${i + 1}. **${ri.title}** (${ri.discipline}) — ${ri.reason}`)
          .join("\n");

  return {
    sections: [
      { key: "summary", title: "Estimate Summary", body: summary },
      { key: "breakdown", title: "Task Breakdown", body: breakdown },
      { key: "quote", title: "Quote", body: quote },
      { key: "risks", title: "Risk Report", body: risks },
    ],
  };
}

/**
 * Recompute the estimate from current tasks + settings and persist a new
 * version of the project's 'estimate' artifact (creating it if needed). Resets
 * review status to 'generated' since the numbers changed.
 */
export async function syncEstimateArtifact(input: {
  projectId: string;
  projectName: string;
  createdBy: string;
}) {
  const settings = await getOrCreateSettings(input.projectId);
  const tasks = (await listTasks(input.projectId)).map(toEngineTask);
  const content = buildEstimateContent(tasks, toEngineSettings(settings));

  const existing = await getProjectArtifactByType(input.projectId, "estimate");
  if (existing) {
    await addVersion({ artifactId: existing.id, content, createdBy: input.createdBy });
    await setReviewStatus(existing.id, "generated");
    return existing;
  }
  return createArtifactWithVersion({
    projectId: input.projectId,
    type: "estimate",
    title: `Estimate — ${input.projectName}`,
    sourceModule: "feature-estimation",
    content,
    createdBy: input.createdBy,
  });
}
