import "server-only";
import { z } from "zod";
import { completeStructured } from "@/lib/ai/gateway";
import type { EngineTask } from "./engine";
import type { Project } from "@/lib/db/types";

const taskSchema = z.object({
  title: z.string(),
  discipline: z.enum(["frontend", "backend", "qa", "pm"]),
  minHours: z.number(),
  maxHours: z.number(),
  uncertainty: z.enum(["low", "medium", "high"]),
});

const breakdownSchema = z.object({
  features: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      tasks: z.array(taskSchema),
    })
  ),
});

export type GeneratedBreakdown = {
  name: string;
  description: string;
  tasks: Omit<EngineTask, "id">[];
}[];

const SYSTEM = `You are a senior technical lead at ABC Solutions, a fixed-price software agency. You break a PRD into a granular, buildable task list for estimation. Disciplines are limited to: frontend, backend, qa, pm (fold database work into backend). For each task give a realistic min and max hour estimate and an uncertainty (low/medium/high). Be thorough but avoid trivial tasks. Higher uncertainty for vague or integration-heavy work.`;

export async function generateBreakdown(
  project: Project,
  prdText: string
): Promise<GeneratedBreakdown> {
  const result = await completeStructured({
    system: SYSTEM,
    prompt: [
      `Project: ${project.name}`,
      project.tech_stack ? `Tech stack: ${project.tech_stack}` : null,
      ``,
      `PRD:`,
      prdText,
      ``,
      `Break this into features, each with estimable tasks across frontend/backend/qa/pm.`,
    ]
      .filter(Boolean)
      .join("\n"),
    schema: breakdownSchema,
  });

  return result.features.map((f) => ({
    name: f.name,
    description: f.description,
    tasks: f.tasks.map((t) => ({
      title: t.title,
      discipline: t.discipline,
      minHours: t.minHours,
      maxHours: t.maxHours,
      uncertainty: t.uncertainty,
    })),
  }));
}
