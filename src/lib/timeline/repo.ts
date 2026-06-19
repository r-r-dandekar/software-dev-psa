import "server-only";
import { getDb } from "@/lib/supabase/context";
import type { ProjectCapacity, TimelineBaseline } from "@/lib/db/types";

const DEFAULTS = {
  devs: 1,
  hours_per_week_per_dev: 40,
  utilization_pct: 70,
};

export async function getOrCreateCapacity(
  projectId: string
): Promise<ProjectCapacity> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("project_capacity")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (data) return data as ProjectCapacity;

  const { data: created, error } = await supabase
    .from("project_capacity")
    .insert({ project_id: projectId, ...DEFAULTS })
    .select("*")
    .single();
  if (error) throw error;
  return created as ProjectCapacity;
}

export async function updateCapacity(
  projectId: string,
  patch: Partial<Omit<ProjectCapacity, "project_id" | "created_at" | "updated_at">>
): Promise<void> {
  const supabase = await getDb();
  await getOrCreateCapacity(projectId);
  const { error } = await supabase
    .from("project_capacity")
    .update(patch)
    .eq("project_id", projectId);
  if (error) throw error;
}

export async function getBaseline(
  projectId: string
): Promise<TimelineBaseline | null> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("timeline_baselines")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  return (data as TimelineBaseline) ?? null;
}

export async function setBaseline(
  row: Omit<TimelineBaseline, "captured_at">
): Promise<void> {
  const supabase = await getDb();
  const { error } = await supabase
    .from("timeline_baselines")
    .upsert({ ...row, captured_at: new Date().toISOString() });
  if (error) throw error;
}
