import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_DIMENSIONS } from "./interview-core";
import type {
  PrdInterview,
  PrdInterviewMessage,
  PrdInterviewDimension,
  PrdInterviewStatus,
  DimensionState,
} from "@/lib/db/types";

export async function getInterview(projectId: string): Promise<PrdInterview | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prd_interviews")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  return (data as PrdInterview) ?? null;
}

export async function createInterview(projectId: string): Promise<PrdInterview> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prd_interviews")
    .insert({ project_id: projectId, status: "in_progress" })
    .select("*")
    .single();
  if (error) throw error;
  const interview = data as PrdInterview;

  await supabase.from("prd_interview_dimensions").insert(
    DEFAULT_DIMENSIONS.map((d, i) => ({
      interview_id: interview.id,
      key: d.key,
      label: d.label,
      state: "open",
      sort_order: i,
    }))
  );
  return interview;
}

export async function setInterviewStatus(
  interviewId: string,
  status: PrdInterviewStatus
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("prd_interviews").update({ status }).eq("id", interviewId);
}

export async function getDimensions(
  interviewId: string
): Promise<PrdInterviewDimension[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prd_interview_dimensions")
    .select("*")
    .eq("interview_id", interviewId)
    .order("sort_order", { ascending: true });
  return (data as PrdInterviewDimension[]) ?? [];
}

export async function getMessages(
  interviewId: string
): Promise<PrdInterviewMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prd_interview_messages")
    .select("*")
    .eq("interview_id", interviewId)
    .order("seq", { ascending: true });
  return (data as PrdInterviewMessage[]) ?? [];
}

export async function appendMessage(input: {
  interviewId: string;
  role: "user" | "assistant";
  content: string;
  payload?: { recommended?: string; options?: string[] };
  seq: number;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("prd_interview_messages").insert({
    interview_id: input.interviewId,
    role: input.role,
    content: input.content,
    payload: input.payload ?? {},
    seq: input.seq,
  });
}

export async function upsertDimension(input: {
  interviewId: string;
  key: string;
  label: string;
  state: DimensionState;
  note?: string | null;
  isCustom?: boolean;
  sortOrder?: number;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("prd_interview_dimensions").upsert(
    {
      interview_id: input.interviewId,
      key: input.key,
      label: input.label,
      state: input.state,
      note: input.note ?? null,
      is_custom: input.isCustom ?? false,
      sort_order: input.sortOrder ?? 99,
    },
    { onConflict: "interview_id,key" }
  );
}

export async function setDimensionState(
  interviewId: string,
  key: string,
  state: DimensionState,
  note?: string | null
): Promise<void> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { state };
  if (note !== undefined) patch.note = note;
  await supabase
    .from("prd_interview_dimensions")
    .update(patch)
    .eq("interview_id", interviewId)
    .eq("key", key);
}
