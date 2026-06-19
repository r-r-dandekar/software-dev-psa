import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Requirement } from "@/lib/db/types";

export async function listRequirements(
  projectId: string
): Promise<Requirement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("requirements")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as Requirement[]) ?? [];
}

export async function addRequirement(input: {
  projectId: string;
  heading: string;
  description?: string | null;
  category?: string;
  priority?: string;
}): Promise<Requirement> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requirements")
    .insert({
      project_id: input.projectId,
      heading: input.heading,
      description: input.description ?? null,
      category: input.category ?? "functional",
      priority: input.priority ?? "must",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Requirement;
}

export async function deleteRequirement(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("requirements").delete().eq("id", id);
  if (error) throw error;
}
