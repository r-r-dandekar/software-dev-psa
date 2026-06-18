import { generateText, generateObject, embed, embedMany } from "ai";
import type { z } from "zod";
import { getModel, getEmbeddingModel } from "./config";

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

/** Generate a schema-validated structured object (provider-neutral). */
export async function completeStructured<T>(input: {
  system?: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<T> {
  const { object } = await generateObject({
    model: getModel(),
    system: input.system,
    prompt: input.prompt,
    schema: input.schema,
    temperature: input.temperature,
  });
  return object;
}

/** Embed a single string (e.g. a search query). */
export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: getEmbeddingModel(), value: text });
  return embedding;
}

/** Embed many strings in one call (e.g. document chunks). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values: texts,
  });
  return embeddings;
}
