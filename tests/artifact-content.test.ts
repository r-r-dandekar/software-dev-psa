import { describe, it, expect } from "vitest";
import {
  nextVersion,
  flattenToText,
  replaceSectionBody,
  type ArtifactContent,
} from "@/lib/artifacts/content";

const sample: ArtifactContent = {
  sections: [
    { key: "exec_summary", title: "Executive Summary", body: "Original summary." },
    { key: "scope_exclusions", title: "Scope Exclusions", body: "Not included: X." },
  ],
};

describe("artifact content helpers", () => {
  it("increments versions (1-based)", () => {
    expect(nextVersion(0)).toBe(1);
    expect(nextVersion(3)).toBe(4);
  });

  it("flattens sections to searchable text", () => {
    expect(flattenToText(sample)).toBe(
      "Executive Summary\nOriginal summary.\n\nScope Exclusions\nNot included: X."
    );
  });

  it("replaces a section body without mutating the original", () => {
    const updated = replaceSectionBody(sample, "exec_summary", "New summary.");
    expect(updated.sections[0].body).toBe("New summary.");
    // original untouched (immutability for snapshots)
    expect(sample.sections[0].body).toBe("Original summary.");
    // other sections preserved
    expect(updated.sections[1]).toEqual(sample.sections[1]);
  });

  it("throws on an unknown section key", () => {
    expect(() => replaceSectionBody(sample, "nope", "x")).toThrow(/Unknown section/);
  });
});
