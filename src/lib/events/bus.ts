import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import type { DomainEvent } from "@/lib/db/types";

export type EmitInput = {
  type: string;
  projectId?: string | null;
  artifactId?: string | null;
  actorId?: string | null;
  payload?: Record<string, unknown>;
};

/**
 * Event Bus (D6): persist a domain event to the log (system of record) and
 * best-effort dispatch to Inngest for async reactions. Inngest failures are
 * non-fatal so the core flow works without the Inngest dev server running.
 */
export async function emitEvent(
  input: EmitInput,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient());
  await supabase.from("domain_events").insert({
    type: input.type,
    project_id: input.projectId ?? null,
    artifact_id: input.artifactId ?? null,
    payload: input.payload ?? {},
    actor_id: input.actorId ?? null,
  });

  try {
    await inngest.send({
      name: input.type,
      data: {
        projectId: input.projectId ?? null,
        artifactId: input.artifactId ?? null,
        actorId: input.actorId ?? null,
        ...(input.payload ?? {}),
      },
    });
  } catch {
    // Async dispatch is best-effort; the persisted event is the source of truth.
  }
}

/** The audit trail for an artifact is its domain-event history (D7). */
export async function listArtifactEvents(
  artifactId: string
): Promise<DomainEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("domain_events")
    .select("*")
    .eq("artifact_id", artifactId)
    .order("created_at", { ascending: true });
  return (data as DomainEvent[]) ?? [];
}
