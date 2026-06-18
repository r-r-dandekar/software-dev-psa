import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest for behavior-level unit tests of the deep modules (Projection Engine,
 * Estimation Engine, Review Workflow, Artifact Store + Event Bus). These are
 * framework-agnostic logic, so the default node environment is used.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
