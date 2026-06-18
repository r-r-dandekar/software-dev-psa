/**
 * Code-review rendering — pure helpers (no I/O). Turns the AI's structured
 * findings into counts, a verdict summary, and a sectioned artifact snapshot
 * (the KB-readable projection) while keeping the structured findings in
 * content.data for the UI.
 */
import type { ArtifactContent } from "@/lib/artifacts/content";

export type Severity = "blocking" | "suggestion" | "nitpick";
export type Dimension = "bug" | "security" | "performance" | "standards" | "tests";

export type CodeFinding = {
  file: string;
  line: number | null;
  severity: Severity;
  dimension: Dimension;
  message: string;
  suggestion?: string;
};

export type CodeReviewResult = {
  verdict: "approve" | "request_changes";
  summary: string;
  findings: CodeFinding[];
};

export function countsBySeverity(findings: CodeFinding[]): Record<Severity, number> {
  return findings.reduce<Record<Severity, number>>(
    (acc, f) => {
      acc[f.severity] += 1;
      return acc;
    },
    { blocking: 0, suggestion: 0, nitpick: 0 }
  );
}

function findingsMarkdown(findings: CodeFinding[]): string {
  if (findings.length === 0) return "No issues found.";
  return [
    `| Severity | Dimension | Location | Issue |`,
    `|---|---|---|---|`,
    ...findings.map(
      (f) =>
        `| ${f.severity} | ${f.dimension} | ${f.file}${f.line ? `:${f.line}` : ""} | ${f.message.replace(/\n/g, " ")} |`
    ),
  ].join("\n");
}

export function buildReviewContent(
  result: CodeReviewResult,
  prNumber: number
): ArtifactContent {
  const c = countsBySeverity(result.findings);
  const verdict = [
    `**Verdict: ${result.verdict === "approve" ? "Approve" : "Request changes"}**`,
    ``,
    `Blocking: ${c.blocking} · Suggestions: ${c.suggestion} · Nitpicks: ${c.nitpick}`,
    ``,
    result.summary,
  ].join("\n");

  return {
    sections: [
      { key: "verdict", title: "Verdict", body: verdict },
      { key: "findings", title: "Findings", body: findingsMarkdown(result.findings) },
    ],
    data: { prNumber, verdict: result.verdict, summary: result.summary, findings: result.findings },
  };
}
