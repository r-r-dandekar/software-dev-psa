import { describe, it, expect } from "vitest";
import { assembleContext, isGap, type RetrievedChunk } from "@/lib/kb/retrieve";

const chunks: RetrievedChunk[] = [
  { artifact_id: "a1", source_ref: "PRD — Acme", content: "Auth via OAuth.", similarity: 0.82 },
  { artifact_id: "a1", source_ref: "PRD — Acme", content: "Roles: admin, user.", similarity: 0.71 },
  { artifact_id: "a2", source_ref: "Estimate — Acme", content: "120h total.", similarity: 0.66 },
];

describe("kb retrieval assembly", () => {
  it("flags a gap when there are no chunks or low similarity", () => {
    expect(isGap([])).toBe(true);
    expect(isGap([{ ...chunks[0], similarity: 0.3 }])).toBe(true);
    expect(isGap(chunks)).toBe(false);
  });

  it("builds numbered context from chunks", () => {
    const { context } = assembleContext(chunks);
    expect(context).toContain("[1] Source: PRD — Acme");
    expect(context).toContain("Auth via OAuth.");
    expect(context).toContain("[3] Source: Estimate — Acme");
  });

  it("dedupes citations by source", () => {
    const { citations } = assembleContext(chunks);
    expect(citations).toEqual([
      { title: "PRD — Acme", artifactId: "a1" },
      { title: "Estimate — Acme", artifactId: "a2" },
    ]);
  });
});
