/**
 * RAG retrieval assembly — pure (no I/O). Builds the prompt context from
 * retrieved chunks and a deduped citation list. Unit-tested.
 */
export type RetrievedChunk = {
  artifact_id: string | null;
  source_ref: string;
  content: string;
  similarity: number;
};

export type Citation = { title: string; artifactId: string | null };

/** Minimum cosine similarity for a chunk to count as relevant. */
export const RELEVANCE_THRESHOLD = 0.5;

export function isGap(chunks: RetrievedChunk[]): boolean {
  return chunks.length === 0 || (chunks[0]?.similarity ?? 0) < RELEVANCE_THRESHOLD;
}

export function assembleContext(chunks: RetrievedChunk[]): {
  context: string;
  citations: Citation[];
} {
  const context = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.source_ref}\n${c.content}`)
    .join("\n\n");

  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const c of chunks) {
    if (seen.has(c.source_ref)) continue;
    seen.add(c.source_ref);
    citations.push({ title: c.source_ref, artifactId: c.artifact_id });
  }

  return { context, citations };
}
