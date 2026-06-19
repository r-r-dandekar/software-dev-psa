import "server-only";
import { getDb } from "@/lib/supabase/context";
import type { ReportSettings } from "@/lib/db/types";

const DEFAULTS = { tone: "non_technical", formality: "formal" };

export async function getOrCreateReportSettings(
  projectId: string
): Promise<ReportSettings> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("report_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (data) return data as ReportSettings;

  const { data: created, error } = await supabase
    .from("report_settings")
    .insert({ project_id: projectId, ...DEFAULTS })
    .select("*")
    .single();
  if (error) throw error;
  return created as ReportSettings;
}

export async function updateReportSettings(
  projectId: string,
  patch: Partial<Pick<ReportSettings, "tone" | "formality" | "notes">>
): Promise<void> {
  const supabase = await getDb();
  await getOrCreateReportSettings(projectId);
  const { error } = await supabase
    .from("report_settings")
    .update(patch)
    .eq("project_id", projectId);
  if (error) throw error;
}
