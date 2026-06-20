import { describe, it, expect } from "vitest";
import {
  countsBySeverity,
  buildReviewContent,
  buildReviewComment,
  buildReviewPayload,
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

  it("formats a PR comment with verdict, counts and findings", () => {
    const c = buildReviewComment(result, 7);
    expect(c).toContain("ABC Code Review — PR #7");
    expect(c).toContain("Request changes");
    expect(c).toContain("Blocking 2");
    expect(c).toContain("`a.ts:10`");
  });

  it("buildReviewPayload: anchors line findings inline, folds line-less into summary", () => {
    const payload = buildReviewPayload(result, 7);
    expect(payload.event).toBe("REQUEST_CHANGES");
    // a.ts line 10 and c.ts line 3 are anchored
    expect(payload.inlineComments).toHaveLength(2);
    expect(payload.inlineComments[0]).toMatchObject({ path: "a.ts", line: 10 });
    expect(payload.inlineComments[1]).toMatchObject({ path: "c.ts", line: 3 });
    // b.ts (null line) ends up in the summary body
    expect(payload.summaryBody).toContain("b.ts");
    expect(payload.summaryBody).toContain("ABC Code Review — PR #7");
  });

  it("buildReviewPayload: approve verdict becomes COMMENT event (never auto-approve)", () => {
    const clean: CodeReviewResult = { verdict: "approve", summary: "LGTM", findings: [] };
    const payload = buildReviewPayload(clean, 1);
    expect(payload.event).toBe("COMMENT");
    expect(payload.inlineComments).toHaveLength(0);
  });

  it("handles a clean review", () => {
    const content = buildReviewContent(
      { verdict: "approve", summary: "LGTM", findings: [] },
      1
    );
    expect(content.sections[1].body).toBe("No issues found.");
  });
});
