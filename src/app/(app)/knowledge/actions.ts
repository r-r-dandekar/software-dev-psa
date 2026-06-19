"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { reindexAll } from "@/lib/kb/index-service";
import { answerQuestion, flagQuery } from "@/lib/kb/query-service";
import type { Citation } from "@/lib/kb/retrieve";

export type AskState = {
  question: string;
  answer: string;
  citations: Citation[];
  isGap: boolean;
  queryId: string;
} | null;

export async function askAction(
  _prev: AskState,
  formData: FormData
): Promise<AskState> {
  const profile = await requireProfile();
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return null;
  const result = await answerQuestion(question, profile.id);
  return { question, ...result };
}

export async function reindexAction() {
  await requireProfile();
  await reindexAll();
  revalidatePath("/knowledge");
}

export async function flagQueryAction(formData: FormData) {
  await requireProfile();
  await flagQuery(String(formData.get("queryId")));
  revalidatePath("/knowledge");
}
