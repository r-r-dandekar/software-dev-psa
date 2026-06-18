/**
 * Artifact content model + pure helpers (D9/D18, S7).
 *
 * An artifact version's `content` is a structured, sectioned snapshot. These
 * helpers are pure (no I/O) so versioning and section-level editing can be
 * unit-tested in isolation; the Supabase-backed store persists the results as
 * immutable versions.
 */

export type ArtifactSection = {
  /** Stable identifier, e.g. "exec_summary". */
  key: string;
  title: string;
  /** Markdown body. */
  body: string;
};

export type ArtifactContent = {
  sections: ArtifactSection[];
  /** Optional structured payload for artifact types that need it (e.g. code
   *  review findings). `sections` remains the human/KB-readable projection. */
  data?: Record<string, unknown>;
};

/** Versions are 1-based; the first snapshot is version 1. */
export function nextVersion(currentVersion: number): number {
  return currentVersion + 1;
}

/** Flatten sectioned content to plain text for search / KB indexing (D9). */
export function flattenToText(content: ArtifactContent): string {
  return content.sections
    .map((s) => `${s.title}\n${s.body}`.trim())
    .join("\n\n")
    .trim();
}

/**
 * Return a NEW content object with one section's body replaced (S7
 * section-level edit/regenerate). Never mutates the input; throws if the
 * section key is unknown so callers can't silently lose edits.
 */
export function replaceSectionBody(
  content: ArtifactContent,
  key: string,
  body: string
): ArtifactContent {
  if (!content.sections.some((s) => s.key === key)) {
    throw new Error(`Unknown section: ${key}`);
  }
  return {
    ...content,
    sections: content.sections.map((s) =>
      s.key === key ? { ...s, body } : s
    ),
  };
}
