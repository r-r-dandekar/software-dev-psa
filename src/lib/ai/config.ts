import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Central AI provider selection (D16). The provider and model are chosen by
 * configuration ONLY — no feature module references a provider directly. To
 * switch providers (including to a free/local model), add a case here and
 * change env; nothing else in the codebase changes.
 *
 * Current build: Claude only. The actual dev provider/model is finalised in
 * Step 1 (where free options like Gemini's free tier can be slotted in).
 */
export type AiProviderId = "anthropic";

const PROVIDER = (process.env.AI_PROVIDER ?? "anthropic") as AiProviderId;
const MODEL = process.env.AI_MODEL ?? "claude-sonnet-4-5";

export function getModel(): LanguageModel {
  switch (PROVIDER) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(MODEL);
    }
    default:
      throw new Error(`Unsupported AI provider: ${PROVIDER}`);
  }
}
