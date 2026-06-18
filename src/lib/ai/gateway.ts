import { generateText } from "ai";
import { getModel } from "./config";

/**
 * The single entry point for all model calls (D16). Feature modules call this
 * gateway — never an SDK/provider directly — so prompts and parsing stay
 * provider-neutral and the provider is swappable via config.
 *
 * Step 0: this is a seam only; the first real call happens in Step 1
 * (PRD Generation). Structured/JSON generation helpers are added there.
 */
export type CompleteInput = {
  /** System / role instructions. */
  system?: string;
  /** The user prompt. */
  prompt: string;
  /** 0 = deterministic. Defaults to the SDK default when omitted. */
  temperature?: number;
};

export async function complete(input: CompleteInput): Promise<string> {
  const { text } = await generateText({
    model: getModel(),
    system: input.system,
    prompt: input.prompt,
    temperature: input.temperature,
  });
  return text;
}
