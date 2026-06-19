import "server-only";
import { getDb } from "@/lib/supabase/context";
import { embedText, complete } from "@/lib/ai/gateway";
import {
  assembleContext,
  isGap,
  type RetrievedChunk,
  type Citation,
} from "./retrieve";

const GAP_ANSWER =
  "I don't have a documented answer for this. It might be a knowledge gap — consider documenting it.";

const SYSTEM = `You are the internal knowledge assistant for ABC Solutions. Answer the question using ONLY the provided context. Cite the sources you used by their name in brackets, e.g. [PRD — Acme]. If the context does not contain the answer, say you don't have a documented answer. Be concise.`;

export type Answer = {
  queryId: string;
  answer: string;
  citations: Citation[];
  isGap: boolean;
};

export async function answerQuestion(
  question: string,
  userId: string
): Promise<Answer> {
  const supabase = await getDb();
  const embedding = await embedText(question);

  const { data } = await supabase.rpc("match_kb_chunks", {
    query_embedding: JSON.stringify(embedding),
    match_count: 6,
  });
  const chunks = (data as RetrievedChunk[]) ?? [];

  let answer: string;
  let citations: Citation[] = [];
  const gap = isGap(chunks);

  if (gap) {
    answer = GAP_ANSWER;
  } else {
    const assembled = assembleContext(chunks);
    citations = assembled.citations;
    answer = await complete({
      system: SYSTEM,
      prompt: `Context:\n${assembled.context}\n\nQuestion: ${question}`,
      temperature: 0.2,
    });
  }

  const { data: row } = await supabase
    .from("kb_queries")
    .insert({
      user_id: userId,
      question,
      answer,
      citations,
      is_gap: gap,
    })
    .select("id")
    .single();

  return { queryId: (row as { id: string })?.id ?? "", answer, citations, isGap: gap };
}

export async function flagQuery(queryId: string): Promise<void> {
  const supabase = await getDb();
  await supabase.from("kb_queries").update({ helpful: false }).eq("id", queryId);
}
