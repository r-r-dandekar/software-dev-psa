import "server-only";
import { z } from "zod";
import { completeStructured } from "@/lib/ai/gateway";
import type { ArtifactContent } from "@/lib/artifacts/content";

export const REPORT_SECTIONS = [
  { key: "win_of_week", title: "🏆 Win of the Week" },
  { key: "progress_summary", title: "Progress Summary" },
  { key: "project_status", title: "Project Status" },
  { key: "blockers", title: "Current Blockers" },
  { key: "next_week", title: "Next Week's Plan" },
  { key: "decisions_needed", title: "Decisions Needed" },
] as const;

type SectionKey = (typeof REPORT_SECTIONS)[number]["key"];

const schema = z.object(
  Object.fromEntries(REPORT_SECTIONS.map((s) => [s.key, z.string()])) as Record<
    SectionKey,
    z.ZodString
  >
);

export type ReportProfile = {
  tone: string; // technical | non_technical
  formality: string; // formal | informal
  notes?: string | null;
  ragHint?: string | null;
};

export async function generateReportContent(input: {
  projectName: string;
  clientName: string;
  periodLabel: string;
  activityBlock: string;
  profile: ReportProfile;
}): Promise<ArtifactContent> {
  const { profile } = input;
  const system = `You are a project manager at ABC Solutions, a fixed-price software agency, writing a weekly client status report. Audience tone: ${profile.tone === "technical" ? "technical" : "non-technical"}, ${profile.formality}. Be direct and concrete; do not pad. Each section is Markdown.${profile.notes ? ` Client notes: ${profile.notes}.` : ""}`;

  const object = await completeStructured({
    system,
    prompt: [
      `Client: ${input.clientName}`,
      `Project: ${input.projectName}`,
      `Reporting period: ${input.periodLabel}`,
      input.profile.ragHint ? `Current delivery RAG: ${input.profile.ragHint}` : null,
      ``,
      `Activity data:`,
      input.activityBlock,
      ``,
      `Write the report. For "Project Status" give an overall RAG (Green/Amber/Red) and one sentence. If there are no blockers, say "No blockers".`,
    ]
      .filter(Boolean)
      .join("\n"),
    schema,
  });

  const obj = object as Record<SectionKey, string>;
  return {
    sections: REPORT_SECTIONS.map((s) => ({
      key: s.key,
      title: s.title,
      body: obj[s.key] ?? "",
    })),
  };
}
