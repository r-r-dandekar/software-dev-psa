import "server-only";
import { getDb } from "@/lib/supabase/context";
import type {
  ProjectIntegration,
  VelocitySnapshot,
  TaskStatus,
} from "@/lib/db/types";

export async function getOrCreateIntegration(
  projectId: string
): Promise<ProjectIntegration> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("project_integrations")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (data) return data as ProjectIntegration;

  const { data: created, error } = await supabase
    .from("project_integrations")
    .insert({ project_id: projectId, provider: "linear" })
    .select("*")
    .single();
  if (error) throw error;
  return created as ProjectIntegration;
}

export async function updateIntegration(
  projectId: string,
  patch: Partial<
    Omit<ProjectIntegration, "project_id" | "created_at" | "updated_at" | "provider">
  >
): Promise<void> {
  const supabase = await getDb();
  await getOrCreateIntegration(projectId);
  const { error } = await supabase
    .from("project_integrations")
    .update(patch)
    .eq("project_id", projectId);
  if (error) throw error;
}

export async function setTaskSync(
  taskId: string,
  patch: {
    status?: TaskStatus;
    completed_at?: string | null;
    external_id?: string;
    external_key?: string;
  }
): Promise<void> {
  const supabase = await getDb();
  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  if (error) throw error;
}

export async function listSnapshots(
  projectId: string
): Promise<VelocitySnapshot[]> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("velocity_snapshots")
    .select("*")
    .eq("project_id", projectId)
    .order("snapshot_date", { ascending: true });
  return (data as VelocitySnapshot[]) ?? [];
}

export async function upsertSnapshot(
  projectId: string,
  values: {
    completed_hours: number;
    total_hours: number;
    done_count: number;
    total_count: number;
  }
): Promise<void> {
  const supabase = await getDb();
  const { error } = await supabase.from("velocity_snapshots").upsert(
    {
      project_id: projectId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      ...values,
    },
    { onConflict: "project_id,snapshot_date" }
  );
  if (error) throw error;
}
