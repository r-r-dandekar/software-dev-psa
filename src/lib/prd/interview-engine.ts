import "server-only";
import { z } from "zod";
import { completeStructured } from "@/lib/ai/gateway";
import type { DimensionLike, RequirementLike } from "./interview-core";

const turnSchema = z.object({
  assistant_message: z.string(),
  recommended_answer: z.string().nullable(),
  options: z.array(z.string()),
  dimension_updates: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      state: z.enum(["open", "resolved", "deferred", "na"]),
      note: z.string(),
    })
  ),
  new_dimensions: z.array(z.object({ key: z.string(), label: z.string() })),
  ready: z.boolean(),
});

export type InterviewTurn = z.infer<typeof turnSchema>;

const SYSTEM = `You are a senior product analyst at ABC Solutions interviewing a colleague to fully clarify the requirements for a fixed-price software project before a PRD is written.

Rules:
- Ask exactly ONE focused question per turn, targeting an OPEN readiness dimension.
- Always provide a concrete "recommended_answer" and 2-4 short "options" the user can pick from.
- When the user's latest answer resolves (or partially resolves) a dimension, return a dimension_update with state "resolved" and a concise "note" capturing the concrete decision. One answer may resolve several dimensions.
- You MAY add project-specific dimensions via "new_dimensions" if the project clearly needs them.
- If the user says they want to defer something, set that dimension's state to "deferred" with their reason as the note.
- NEVER invent facts. If something is unclear, ask — do not assume.
- Set "ready" to true ONLY when every dimension is resolved, deferred, or n-a. Otherwise keep asking.
- Be concise and concrete. No filler.`;

export async function runInterviewTurn(input: {
  requirements: RequirementLike[];
  dimensions: (DimensionLike & { key: string; state: string })[];
  recentMessages: { role: string; content: string }[];
  userMessage: string;
}): Promise<InterviewTurn> {
  const reqBlock = input.requirements.length
    ? input.requirements
        .map((r) => `- ${r.heading}${r.description ? `: ${r.description}` : ""}`)
        .join("\n")
    : "(none provided)";

  const dimBlock = input.dimensions
    .map((d) => `- [${d.state}] ${d.key}: ${d.label}${d.note ? ` (note: ${d.note})` : ""}`)
    .join("\n");

  const transcript = input.recentMessages
    .map((m) => `${m.role === "assistant" ? "Analyst" : "User"}: ${m.content}`)
    .join("\n");

  const result = await completeStructured({
    system: SYSTEM,
    prompt: [
      `Requirements provided so far:`,
      reqBlock,
      ``,
      `Readiness dimensions and their current state:`,
      dimBlock,
      ``,
      `Recent conversation:`,
      transcript || "(start of interview)",
      ``,
      `User's latest message: ${input.userMessage || "(none — produce the first question)"}`,
      ``,
      `Respond with your next turn.`,
    ].join("\n"),
    schema: turnSchema,
    temperature: 0.3,
  });

  return result as InterviewTurn;
}
