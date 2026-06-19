import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/kb/chunk";

describe("kb chunking", () => {
  it("keeps small text as a single chunk", () => {
    expect(chunkText("Hello world.\n\nSecond para.")).toEqual([
      "Hello world.\n\nSecond para.",
    ]);
  });

  it("groups paragraphs up to the max size", () => {
    const p = "a".repeat(700);
    const q = "b".repeat(700);
    const chunks = chunkText(`${p}\n\n${q}`, 1200);
    expect(chunks).toHaveLength(2); // 700 + 700 > 1200, so split
    expect(chunks[0]).toBe(p);
    expect(chunks[1]).toBe(q);
  });

  it("hard-splits an oversized paragraph", () => {
    const big = "x".repeat(2500);
    const chunks = chunkText(big, 1000);
    expect(chunks).toHaveLength(3); // 1000 + 1000 + 500
    expect(chunks[0].length).toBe(1000);
  });

  it("drops empty input", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });
});
