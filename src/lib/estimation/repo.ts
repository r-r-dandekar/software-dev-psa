import "server-only";
import { getDb } from "@/lib/supabase/context";
import type {
  Feature,
  Task,
  EstimateSettingsRow,
  TaskDiscipline,
  TaskUncertainty,
} from "@/lib/db/types";
import type { EngineTask, EstimateSettings } from "./engine";

const DEFAULT_SETTINGS = {
  currency: "INR",
  day_rate: 30000,
  hours_per_day: 8,
  margin_pct: 30,
  contingency_pct: 15,
};

export async function getOrCreateSettings(
  projectId: string
): Promise<EstimateSettingsRow> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("estimate_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (data) return data as EstimateSettingsRow;

  const { data: created, error } = await supabase
    .from("estimate_settings")
    .insert({ project_id: projectId, ...DEFAULT_SETTINGS })
    .select("*")
    .single();
  if (error) throw error;
  return created as EstimateSettingsRow;
}

export async function updateSettings(
  projectId: string,
  patch: Partial<Omit<EstimateSettingsRow, "project_id" | "created_at" | "updated_at">>
): Promise<void> {
  const supabase = await getDb();
  await getOrCreateSettings(projectId); // ensure row exists
  const { error } = await supabase
    .from("estimate_settings")
    .update(patch)
    .eq("project_id", projectId);
  if (error) throw error;
}

export async function listFeatures(projectId: string): Promise<Feature[]> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("features")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  return (data as Feature[]) ?? [];
}

export async function listTasks(projectId: string): Promise<Task[]> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as Task[]) ?? [];
}

/** Replace the whole breakdown (used after AI (re)generation). */
export async function replaceBreakdown(
  projectId: string,
  features: { name: string; description?: string; tasks: Omit<EngineTask, "id">[] }[]
): Promise<void> {
  const supabase = await getDb();
  await supabase.from("tasks").delete().eq("project_id", projectId);
  await supabase.from("features").delete().eq("project_id", projectId);

  let sort = 0;
  for (const f of features) {
    const { data: feature, error: fErr } = await supabase
      .from("features")
      .insert({
        project_id: projectId,
        name: f.name,
        description: f.description ?? null,
        sort_order: sort++,
      })
      .select("id")
      .single();
    if (fErr) throw fErr;

    if (f.tasks.length > 0) {
      const { error: tErr } = await supabase.from("tasks").insert(
        f.tasks.map((t, i) => ({
          project_id: projectId,
          feature_id: (feature as { id: string }).id,
          title: t.title,
          discipline: t.discipline,
          min_hours: t.minHours,
          max_hours: t.maxHours,
          uncertainty: t.uncertainty,
          sort_order: i,
        }))
      );
      if (tErr) throw tErr;
    }
  }
}

export async function updateTask(
  id: string,
  patch: {
    min_hours?: number;
    max_hours?: number;
    uncertainty?: TaskUncertainty;
    discipline?: TaskDiscipline;
    title?: string;
    override_note?: string;
  }
): Promise<void> {
  const supabase = await getDb();
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await getDb();
  await supabase.from("tasks").delete().eq("id", id);
}

// --- adapters to the pure engine ---

export function toEngineTask(t: Task): EngineTask {
  return {
    id: t.id,
    title: t.title,
    discipline: t.discipline,
    minHours: Number(t.min_hours),
    maxHours: Number(t.max_hours),
    uncertainty: t.uncertainty,
  };
}

export function toEngineSettings(s: EstimateSettingsRow): EstimateSettings {
  return {
    currency: s.currency,
    dayRate: Number(s.day_rate),
    hoursPerDay: Number(s.hours_per_day),
    marginPct: Number(s.margin_pct),
    contingencyPct: Number(s.contingency_pct),
  };
}
