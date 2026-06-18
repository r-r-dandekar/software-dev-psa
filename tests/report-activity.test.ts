import { describe, it, expect } from "vitest";
import { summarizeActivity, summaryToPromptBlock } from "@/lib/reports/activity";

const input = {
  commits: [
    { message: "feat: add login\n\nbody text", author: "a", date: "2026-01-01" },
    { message: "feat: add login", author: "a", date: "2026-01-02" }, // dup first line
    { message: "fix: null check", author: "b", date: "2026-01-03" },
  ],
  prs: [
    { number: 1, title: "Login", mergedAt: "2026-01-02", open: false },
    { number: 2, title: "Dashboard", mergedAt: null, open: true },
    { number: 3, title: "WIP", mergedAt: null, open: true },
  ],
  tasks: [
    { title: "Auth UI", status: "done" as const },
    { title: "Auth API", status: "in_progress" as const },
    { title: "Backlog item", status: "todo" as const },
  ],
};

describe("status report activity summary", () => {
  it("counts commits, merged and open PRs", () => {
    const s = summarizeActivity(input);
    expect(s.commitCount).toBe(3);
    expect(s.mergedPrCount).toBe(1);
    expect(s.openPrCount).toBe(2);
  });

  it("dedupes commit first-lines", () => {
    const s = summarizeActivity(input);
    expect(s.topCommitMessages).toEqual(["feat: add login", "fix: null check"]);
  });

  it("splits tasks by status", () => {
    const s = summarizeActivity(input);
    expect(s.completedTasks).toEqual(["Auth UI"]);
    expect(s.inProgressTasks).toEqual(["Auth API"]);
  });

  it("renders a prompt block", () => {
    const block = summaryToPromptBlock(summarizeActivity(input));
    expect(block).toContain("Commits this period: 3");
    expect(block).toContain("- Auth UI");
  });
});
