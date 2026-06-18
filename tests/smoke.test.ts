import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

/**
 * Step 0 smoke test: confirms the test runner works and the `@/*` path alias
 * resolves. Real deep-module suites arrive from Step 1 onward.
 */
describe("test harness", () => {
  it("runs and resolves the @ alias", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
