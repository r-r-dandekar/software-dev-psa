import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * Central AI provider selection (D16). The provider and model are chosen by
 * configuration ONLY — no feature module references a provider directly. To
 * switch providers, change AI_PROVIDER/AI_MODEL env; nothing else changes.
 *
 * Current dev build: Google Gemini (free tier). Production can switch to
 * Claude by setting AI_PROVIDER=anthropic — no code changes required.
 */
export type AiProviderId = "google" | "anthropic";

const PROVIDER = (process.env.AI_PROVIDER ?? "google") as AiProviderId;

const DEFAULT_MODEL: Record<AiProviderId, string> = {
  google: "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-5",
};

const MODEL = process.env.AI_MODEL ?? DEFAULT_MODEL[PROVIDER];

export function getModel(): LanguageModel {
  switch (PROVIDER) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(MODEL);
    }
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
