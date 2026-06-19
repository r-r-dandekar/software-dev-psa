import "server-only";
import { z } from "zod";
import { completeStructured } from "@/lib/ai/gateway";
import type { ArtifactContent } from "@/lib/artifacts/content";
import type { Project } from "@/lib/db/types";
import type { Requirement } from "@/lib/db/types";

/** Fixed PRD section structure (the projection over the spec — D18, S7). */
export const PRD_SECTIONS = [
  { key: "executive_summary", title: "Executive Summary" },
  { key: "goals_success", title: "Goals & Success Metrics" },
  { key: "user_personas", title: "User Personas" },
  { key: "functional_specs", title: "Functional Specifications" },
  { key: "technical_constraints", title: "Technical Constraints" },
  { key: "integration_specs", title: "Integration Specifications" },
  { key: "scope_exclusions", title: "Scope Exclusions (fixed-price protection)" },
  { key: "assumptions_dependencies", title: "Assumptions & Dependencies" },
  { key: "open_questions", title: "Open Questions" },
] as const;

type SectionKey = (typeof PRD_SECTIONS)[number]["key"];

const sectionSchema = z.object(
  Object.fromEntries(
    PRD_SECTIONS.map((s) => [s.key, z.string().describe(s.title)])
  ) as Record<SectionKey, z.ZodString>
);

const SYSTEM = `You are a senior product manager at ABC Solutions, a boutique fixed-price software agency (10-50 people) building custom web and mobile applications for startups and SMBs. You write precise, buildable PRDs. Because projects are fixed-price, the Scope Exclusions section is critical contractual protection: be aggressive and explicit about what is NOT included. Each section must be Markdown. Be specific; avoid filler.`;

function requirementsBlock(requirements: Requirement[]): string {
  if (requirements.length === 0) return "(No structured requirements provided.)";
  return requirements
    .map(
      (r) =>
        `- [${r.category}/${r.priority}] ${r.description}`
    )
    .join("\n");
}

function buildPrompt(project: Project, requirements: Requirement[]): string {
  return [
    `Project: ${project.name}`,
    project.tech_stack ? `Tech stack: ${project.tech_stack}` : null,
    project.target_launch ? `Target launch: ${project.target_launch}` : null,
    ``,
    `Structured requirements:`,
    requirementsBlock(requirements),
    ``,
    `Produce a complete PRD. For each section, write detailed Markdown a developer could build from without further clarification on functional requirements.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function toContent(object: Record<SectionKey, string>): ArtifactContent {
  return {
    sections: PRD_SECTIONS.map((s) => ({
      key: s.key,
      title: s.title,
      body: object[s.key] ?? "",
    })),
  };
}

/** Generate a full PRD as sectioned artifact content (first real AI call). */
export async function generatePrdContent(
  project: Project,
  requirements: Requirement[]
): Promise<ArtifactContent> {
  const object = await completeStructured({
    system: SYSTEM,
    prompt: buildPrompt(project, requirements),
    schema: sectionSchema,
  });
  return toContent(object as Record<SectionKey, string>);
}

const SYSTEM_FROM_INTERVIEW = `${SYSTEM}

CRITICAL: Use ONLY the clarified decisions and requirements provided below. Do NOT invent or assume any detail that is not stated. For anything marked DEFERRED, NOT APPLICABLE, or otherwise unresolved, do not guess — list it under "Open Questions". A faithful, modest PRD is the goal; do not embellish.`;

/** Generate a PRD from the interview digest (D5 — no invention). */
export async function generatePrdContentFromDigest(
  project: Project,
  digest: string
): Promise<ArtifactContent> {
  const object = await completeStructured({
    system: SYSTEM_FROM_INTERVIEW,
    prompt: [
      `Project: ${project.name}`,
      project.tech_stack ? `Tech stack: ${project.tech_stack}` : null,
      project.target_launch ? `Target launch: ${project.target_launch}` : null,
      ``,
      `Clarified inputs (the ONLY source of truth):`,
      digest,
      ``,
      `Produce the PRD strictly from the above.`,
    ]
      .filter(Boolean)
      .join("\n"),
    schema: sectionSchema,
  });
  return toContent(object as Record<SectionKey, string>);
}

/** Regenerate a single section's body (S7), keeping the rest untouched. */
export async function generatePrdSection(
  project: Project,
  requirements: Requirement[],
  sectionKey: string
): Promise<string> {
  const def = PRD_SECTIONS.find((s) => s.key === sectionKey);
  if (!def) throw new Error(`Unknown PRD section: ${sectionKey}`);

  const result = await completeStructured({
    system: SYSTEM,
    prompt: [
      buildPrompt(project, requirements),
      ``,
      `Write ONLY the "${def.title}" section as Markdown.`,
    ].join("\n"),
    schema: z.object({ body: z.string().describe(def.title) }),
  });
  return (result as { body: string }).body;
}
