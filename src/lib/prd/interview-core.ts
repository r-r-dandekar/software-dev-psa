/**
 * PRD interview core — pure logic (no I/O). Readiness gating, the default
 * dimension floor, and the digest that feeds PRD generation. Unit-tested.
 */
import type { DimensionState } from "@/lib/db/types";

export const DEFAULT_DIMENSIONS: { key: string; label: string }[] = [
  { key: "goal", label: "Goal & success criteria" },
  { key: "users", label: "User roles / personas" },
  { key: "flows", label: "Core flows & key features" },
  { key: "data", label: "Data & integrations" },
  { key: "nonfunctional", label: "Non-functional needs (perf, security, scale)" },
  { key: "constraints", label: "Constraints & assumptions" },
  { key: "out_of_scope", label: "Out of scope" },
  { key: "acceptance", label: "Acceptance criteria" },
];

export type DimensionLike = { label: string; state: DimensionState; note: string | null };
export type RequirementLike = { heading: string; description: string | null };

/** Ready to generate once there is ≥1 dimension and none are still open (D1). */
export function isInterviewReady(dimensions: { state: DimensionState }[]): boolean {
  return dimensions.length > 0 && dimensions.every((d) => d.state !== "open");
}

export function openCount(dimensions: { state: DimensionState }[]): number {
  return dimensions.filter((d) => d.state === "open").length;
}

/**
 * Build the structured digest the generator consumes (D5). Resolved notes are
 * facts; deferred/na items are surfaced so the PRD can flag them as Open
 * Questions rather than invent answers.
 */
export function buildDigest(input: {
  requirements: RequirementLike[];
  dimensions: DimensionLike[];
}): string {
  const reqs = input.requirements.length
    ? input.requirements
        .map((r) => `- ${r.heading}${r.description ? `: ${r.description}` : ""}`)
        .join("\n")
    : "(none)";

  const decisions = input.dimensions
    .map((d) => {
      switch (d.state) {
        case "resolved":
          return `- ${d.label} — RESOLVED: ${d.note ?? ""}`.trim();
        case "deferred":
          return `- ${d.label} — DEFERRED (treat as an Open Question): ${d.note ?? ""}`.trim();
        case "na":
          return `- ${d.label} — NOT APPLICABLE`;
        default:
          return `- ${d.label} — UNRESOLVED`;
      }
    })
    .join("\n");

  return `Requirements:\n${reqs}\n\nClarified decisions:\n${decisions}`;
}
