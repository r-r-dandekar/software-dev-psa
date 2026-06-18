import { describe, it, expect } from "vitest";
import {
  countsBySeverity,
  buildReviewContent,
  type CodeReviewResult,
} from "@/lib/codereview/render";

const result: CodeReviewResult = {
  verdict: "request_changes",
  summary: "Two blockers found.",
  findings: [
    { file: "a.ts", line: 10, severity: "blocking", dimension: "security", message: "SQL injection" },
    { file: "b.ts", line: null, severity: "blocking", dimension: "bug", message: "null deref" },
    { file: "c.ts", line: 3, severity: "suggestion", dimension: "performance", message: "N+1" },
  ],
};

describe("code review render", () => {
  it("counts findings by severity", () => {
    expect(countsBySeverity(result.findings)).toEqual({
      blocking: 2,
      suggestion: 1,
      nitpick: 0,
    });
  });

  it("builds sectioned content + keeps structured findings in data", () => {
    const content = buildReviewContent(result, 42);
    expect(content.sections.map((s) => s.key)).toEqual(["verdict", "findings"]);
    expect(content.sections[0].body).toContain("Request changes");
    expect(content.sections[0].body).toContain("Blocking: 2");
    expect(content.sections[1].body).toContain("SQL injection");
    expect(content.data?.prNumber).toBe(42);
    expect((content.data?.findings as unknown[]).length).toBe(3);
  });

  it("handles a clean review", () => {
    const content = buildReviewContent(
      { verdict: "approve", summary: "LGTM", findings: [] },
      1
    );
    expect(content.sections[1].body).toBe("No issues found.");
  });
});
