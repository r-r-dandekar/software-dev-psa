import "server-only";
import { z } from "zod";
import { completeStructured } from "@/lib/ai/gateway";
import type { CodeReviewResult } from "./render";

const MAX_DIFF_CHARS = 14000;

const schema = z.object({
  verdict: z.enum(["approve", "request_changes"]),
  summary: z.string(),
  findings: z.array(
    z.object({
      file: z.string(),
      line: z.number().nullable(),
      severity: z.enum(["blocking", "suggestion", "nitpick"]),
      dimension: z.enum(["bug", "security", "performance", "standards", "tests"]),
      message: z.string(),
      suggestion: z.string().optional(),
    })
  ),
});

const ALL_DIMENSIONS = ["bug", "security", "performance", "standards", "tests"] as const;

function buildSystem(enabledDimensions: string[]): string {
  const dims = ALL_DIMENSIONS.filter((d) => enabledDimensions.includes(d));
  const descriptions: Record<string, string> = {
    bug: "bugs (blocking)",
    security: "security (blocking)",
    performance: "performance (suggestion)",
    standards: "standards (suggestion)",
    tests: "test coverage (suggestion)",
  };
  const dimList = dims.map((d) => descriptions[d]).join(", ");
  return `You are a senior code reviewer at ABC Solutions, a software agency with high standards for TypeScript quality, security, and performance. Review the pull request diff across these dimensions: ${dimList}. For each issue give file, line (or null), severity (blocking/suggestion/nitpick), dimension, a concise message, and an optional concrete fix. Then give an overall verdict (approve if no blocking issues, else request_changes) and a one-paragraph summary. Be precise; do not invent issues.`;
}

export async function generateReview(input: {
  prTitle: string;
  prBody: string;
  diff: string;
  techStack: string | null;
  enabledDimensions?: string[];
}): Promise<CodeReviewResult> {
  const diff =
    input.diff.length > MAX_DIFF_CHARS
      ? `${input.diff.slice(0, MAX_DIFF_CHARS)}\n…(diff truncated)`
      : input.diff;

  const enabledDimensions = input.enabledDimensions ?? [...ALL_DIMENSIONS];
  const result = await completeStructured({
    system: buildSystem(enabledDimensions),
    prompt: [
      input.techStack ? `Tech stack: ${input.techStack}` : null,
      `PR title: ${input.prTitle}`,
      input.prBody ? `PR description: ${input.prBody}` : null,
      ``,
      `Diff:`,
      diff,
    ]
      .filter(Boolean)
      .join("\n"),
    schema,
  });

  return result as CodeReviewResult;
}
