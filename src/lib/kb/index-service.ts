import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentVersion } from "@/lib/artifacts/store";
import { embedTexts } from "@/lib/ai/gateway";
import { chunkText } from "./chunk";
import type { Artifact } from "@/lib/db/types";

export type IndexResult = { artifacts: number; chunks: number };

/**
 * (Re)index the whole artifact corpus into kb_chunks. Manual trigger for now;
 * a nightly Inngest job is the deferred background-work follow-up.
 */
export async function reindexAll(): Promise<IndexResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("*")
    .gt("current_version", 0);
  const artifacts = (data as Artifact[]) ?? [];

  let chunkTotal = 0;
  for (const artifact of artifacts) {
    const version = await getCurrentVersion(artifact.id);
    if (!version || !version.text_content.trim()) continue;

    const chunks = chunkText(version.text_content);
    if (chunks.length === 0) continue;

    const embeddings = await embedTexts(chunks);

    // Replace existing chunks for this artifact (idempotent re-index).
    await supabase.from("kb_chunks").delete().eq("artifact_id", artifact.id);
    const rows = chunks.map((content, i) => ({
      project_id: artifact.project_id,
      artifact_id: artifact.id,
      source_type: "artifact",
      source_ref: artifact.title,
      chunk_index: i,
      content,
      embedding: JSON.stringify(embeddings[i]),
    }));
    const { error } = await supabase.from("kb_chunks").insert(rows);
    if (error) throw error;
    chunkTotal += rows.length;
  }

  return { artifacts: artifacts.length, chunks: chunkTotal };
}

export async function countChunks(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("kb_chunks")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}
